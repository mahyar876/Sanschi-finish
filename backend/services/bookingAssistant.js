const { parseBookingIntent } = require('../lib/assistantParse');
const { parseMessageToIntent } = require('../lib/assistantParse');
const { validateAssistantIntent } = require('../lib/assistantValidate');
const { searchPitchesForIntent } = require('./assistantSearch');

/**
 * @param {{ message: string, limit?: number }} input
 */
async function recommendFromMessage(input) {
  const message = String(input.message || '').trim();
  if (!message) {
    return {
      ok: false,
      code: 400,
      message: 'لطفاً بگویید چه روزی و حدوداً چه ساعتی می‌خواهید بازی کنید.',
    };
  }

  const now = new Date();
  const { extracted } = parseMessageToIntent(message, now);
  const validated = validateAssistantIntent(extracted, now);

  if (validated.needsClarification) {
    return {
      ok: true,
      intent: validated,
      summary: validated.clarificationQuestion,
      results: [],
      needsInput: true,
      engine: 'rules',
    };
  }

  const search = await searchPitchesForIntent(validated, {
    limit: input.limit,
    now,
  });

  return {
    ok: true,
    intent: { ...validated, date: search.usedDate },
    summary: search.summary,
    results: search.results,
    needsInput: false,
    engine: 'rules',
  };
}

module.exports = { recommendFromMessage, parseBookingIntent };
