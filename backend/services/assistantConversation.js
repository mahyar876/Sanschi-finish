const { parseMessageToIntent, normalizeText, parseHour } = require('../lib/assistantParse');
const { mergeIntentState, emptyAssistantIntent } = require('../lib/assistantIntent');
const {
  validateAssistantIntent,
  sanitizeUserMessage,
  resolveHourAmPmReply,
} = require('../lib/assistantValidate');
const { getSession, saveSession } = require('../lib/assistantSessionStore');
const { searchPitchesForIntent } = require('./assistantSearch');
const { extractWithLlm } = require('./assistantLlm');
const { mapLlmPayloadToIntent } = require('../lib/assistantLlmMerge');
const { getLastSuccessfulPitch } = require('./assistantUserHistory');
const { detectAssistantTopic, buildTopicReply } = require('../lib/assistantTopics');
const {
  parseConversationAdjustments,
  applyAdjustmentsToIntent,
} = require('../lib/assistantCorrections');

function formatIntentForClient(intent) {
  return {
    intent: intent.intent,
    sport: intent.sport,
    pitchType: intent.pitchType,
    venueCategory: intent.venueCategory,
    surface: intent.surface,
    date: intent.date,
    dateLabel: intent.dateLabel,
    hour: intent.hour,
    minute: intent.minute,
    timeRange: intent.timeRange,
    eveningWindow: intent.eveningWindow,
    flexibleTime: intent.flexibleTime,
    district: intent.district,
    zone: intent.zone,
    maxPrice: intent.maxPrice,
    pitchId: intent.pitchId,
    pitchName: intent.pitchName,
    slotDurationHours: intent.slotDurationHours,
    repeatPreviousPitch: intent.repeatPreviousPitch,
    sortBy: intent.sortBy,
    missingFields: intent.missingFields,
    ambiguities: intent.ambiguities,
    needsClarification: intent.needsClarification,
    warnings: intent.warnings,
    confidence: intent.confidence,
  };
}

function buildAssistantReply(validated, results, summary) {
  if (validated.needsClarification && validated.clarificationQuestion) {
    return validated.clarificationQuestion;
  }
  if (validated.warnings?.length && !results.length) {
    return `${validated.warnings[0]} ${summary}`;
  }
  if (!results.length) {
    return summary;
  }
  if (results.length >= 2) {
    const intro =
      'چند گزینه با سانس آزاد پیدا شد — قیمت و محدوده فرق می‌کنند؛ برای رزرو قطعی باید از لینک مجموعه پرداخت کنی.';
    return `${intro}\n${summary}`;
  }
  return `${summary} برای رزرو نهایی، مجموعه را باز کن و پرداخت را تکمیل کن.`;
}

function isShortFollowUp(extracted, adjustments) {
  if (adjustments.resultOrdinal || adjustments.forceCheaper) return true;
  if (extracted.districtExplicit) return false;
  if (extracted.dateExplicit || extracted.timeExplicit) return false;
  if (extracted.pitchType) return false;
  return !!(adjustments.dateOverride || adjustments.pitchTypeOverride || adjustments.clearHour);
}

/**
 * @param {{ message: string, sessionId?: string, limit?: number, userId?: string }} input
 */
async function handleAssistantChat(input) {
  const message = sanitizeUserMessage(input.message);
  if (!message) {
    return {
      ok: false,
      code: 400,
      message: 'پیام خالی است.',
    };
  }

  const now = new Date();
  const prev = getSession(input.sessionId);
  const prevIntent = prev?.intent || emptyAssistantIntent();
  const prevResults = prev?.lastResults || [];

  let authBlockQuestion = null;

  const { extracted, meta } = parseMessageToIntent(message, now);
  const adjustments = parseConversationAdjustments(message, now);

  const topic = detectAssistantTopic(message);
  if (topic && !extracted.dateExplicit && !extracted.timeExplicit && !extracted.pitchType) {
    const faqReply = buildTopicReply(topic.type);
    if (faqReply) {
      const sessionId = saveSession(input.sessionId, {
        intent: prevIntent,
        lastResults: prevResults,
        userId: input.userId,
      });
      return {
        ok: true,
        sessionId,
        reply: faqReply,
        intent: formatIntentForClient(prevIntent),
        results: [],
        needsInput: false,
        engine: 'faq',
      };
    }
  }

  const llmRaw = await extractWithLlm(message, prevIntent).catch(() => null);
  const llmIntent = mapLlmPayloadToIntent(llmRaw);

  let merged = mergeIntentState(prevIntent, extracted, {
    sortHint: meta.sortHint,
    flexibleTimeExplicit: extracted.flexibleTime,
  });

  if (llmIntent) {
    merged = mergeIntentState(merged, llmIntent);
  }

  if (meta.weekFlexible) {
    merged.weekFlexible = true;
    merged.flexibleTime = true;
    merged.sortBy = meta.sortHint || merged.sortBy || 'price_asc';
  }

  const timePart = parseHour(message);
  merged = applyAdjustmentsToIntent(merged, adjustments, timePart);

  if (
    isShortFollowUp(extracted, adjustments) &&
    adjustments.resultOrdinal &&
    prevResults[adjustments.resultOrdinal - 1]
  ) {
    const pick = prevResults[adjustments.resultOrdinal - 1];
    const sessionId = saveSession(input.sessionId, {
      intent: prevIntent,
      lastResults: prevResults,
      userId: input.userId,
    });
    return {
      ok: true,
      sessionId,
      reply: `گزینهٔ ${adjustments.resultOrdinal}: «${pick.name}» — سانس ${pick.slot?.time} با قیمت ${pick.slot?.sitePrice?.toLocaleString('fa-IR')} تومان (از سرور). برای رزرو قطعی باید پرداخت را در صفحهٔ مجموعه انجام بدهی.`,
      intent: formatIntentForClient(prevIntent),
      results: [pick],
      needsInput: false,
      engine: 'rules',
    };
  }

  const tNorm = normalizeText(message);
  merged = resolveHourAmPmReply(merged, tNorm);

  if (
    /فقط|همین\s*ساعت|دقیقا|دقیقاً|همون\s*ساعت|همین\s*ساعته/.test(tNorm) &&
    merged.hour != null &&
    !merged.timeRangeExplicit
  ) {
    merged = {
      ...merged,
      timeRange: { startHour: merged.hour, endHour: merged.hour + 1 },
      timeRangeExplicit: true,
    };
  }

  if (meta.sortHint === 'price_asc' && !extracted.dateExplicit && !extracted.timeExplicit) {
    merged.sortBy = 'price_asc';
  }

  if (merged.repeatPreviousPitch) {
    if (!input.userId) {
      authBlockQuestion =
        'برای «همون زمین قبلی» باید وارد حسابت شوی. از بالای سایت ورود کن، بعد دوباره همین درخواست را بفرست.';
    } else {
      const last = await getLastSuccessfulPitch(input.userId);
      if (last) {
        merged.pitchId = last.pitchId;
        merged.pitchName = last.pitchName;
        if (!merged.pitchType) merged.pitchType = last.pitchType;
      } else {
        authBlockQuestion =
          'رزرو موفق قبلی در حسابت پیدا نشد. اسم محله یا نوع زمین (چمن/فوتسال) را بگو تا جستجو کنیم.';
      }
    }
  }

  let engine = llmIntent ? 'rules+llm' : 'rules';
  let validated = validateAssistantIntent(merged, now);
  if (authBlockQuestion) {
    validated = {
      ...validated,
      needsClarification: true,
      clarificationQuestion: authBlockQuestion,
    };
  }

  const { needsClarification: _nc, clarificationQuestion: _cq, ...intentForStore } = validated;

  if (validated.needsClarification) {
    const sessionId = saveSession(input.sessionId, {
      intent: intentForStore,
      lastResults: prevResults,
      userId: input.userId,
    });
    return {
      ok: true,
      sessionId,
      reply: validated.clarificationQuestion,
      intent: formatIntentForClient(validated),
      results: [],
      needsInput: true,
      engine,
    };
  }

  let search;
  try {
    search = await searchPitchesForIntent(validated, {
      limit: input.limit,
      now,
    });
  } catch (err) {
    console.error('assistant search error:', err.message);
    const sessionId = saveSession(input.sessionId, {
      intent: intentForStore,
      lastResults: prevResults,
      userId: input.userId,
    });
    return {
      ok: true,
      sessionId,
      reply:
        'الان به لیست زمین‌ها یا سانس‌ها دسترسی ندارم (مشکل موقت سرور). یک دقیقه بعد دوباره بفرست یا از صفحهٔ «زمین‌ها» جستجو کن.',
      intent: formatIntentForClient(validated),
      results: [],
      needsInput: false,
      engine,
    };
  }

  const reply = buildAssistantReply(validated, search.results, search.summary);
  const sessionId = saveSession(input.sessionId, {
    intent: intentForStore,
    lastResults: search.results,
    userId: input.userId,
  });

  return {
    ok: true,
    sessionId,
    reply,
    summary: search.summary,
    intent: formatIntentForClient({ ...validated, date: search.usedDate }),
    results: search.results,
    needsInput: false,
    engine,
  };
}

module.exports = { handleAssistantChat, formatIntentForClient };
