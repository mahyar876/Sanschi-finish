/** ساختار استاندارد قصد رزرو — مستقل از مدل زبانی */

function emptyAssistantIntent() {
  return {
    intent: 'search_pitch',
    sport: 'football',
    pitchType: null,
    venueCategory: null,
    surface: null,
    date: null,
    dateLabel: null,
    alternateDates: [],
    hour: null,
    minute: 0,
    timeRange: null,
    afterHour: null,
    beforeHour: null,
    flexibleTime: false,
    city: 'تهران',
    district: null,
    districtExplicit: false,
    womenOnly: false,
    zone: null,
    maxPrice: null,
    playersCount: null,
    sortBy: 'match',
    preferences: [],
    requiredAmenities: [],
    weekFlexible: false,
    eveningWindow: false,
    missingFields: [],
    ambiguities: [],
    needsClarification: false,
    clarificationQuestion: null,
    confidence: 'low',
    warnings: [],
    dateExplicit: false,
    timeExplicit: false,
    timeRangeExplicit: false,
    repeatPreviousPitch: false,
    pitchId: null,
    pitchName: null,
    slotDurationHours: 1,
    searchAnywhere: false,
  };
}

const MERGE_KEYS = [
  'pitchType',
  'venueCategory',
  'surface',
  'date',
  'dateLabel',
  'hour',
  'minute',
  'timeRange',
  'afterHour',
  'beforeHour',
  'flexibleTime',
  'district',
  'districtExplicit',
  'womenOnly',
  'zone',
  'maxPrice',
  'playersCount',
  'sortBy',
  'city',
  'pitchId',
  'pitchName',
  'slotDurationHours',
  'repeatPreviousPitch',
  'preferences',
  'requiredAmenities',
  'weekFlexible',
  'eveningWindow',
  'maxPrice',
];

const MERGE_NULLABLE = new Set(['maxPrice', 'district', 'pitchId', 'pitchName', 'zone']);

/**
 * ادغام state قبلی با استخراج جدید؛ فیلدهای صریح جدید جایگزین می‌شوند.
 */
/** intent ذخیره‌شده در session — بدون پرچم‌های گفت‌وگوی turn قبل */
function intentFromSession(prev) {
  if (!prev) return emptyAssistantIntent();
  const {
    needsClarification: _nc,
    clarificationQuestion: _cq,
    missingFields: _mf,
    ...rest
  } = prev;
  return { ...emptyAssistantIntent(), ...rest };
}

function mergeIntentState(prev, extracted, meta = {}) {
  const base = intentFromSession(prev);
  const out = { ...base, needsClarification: false, clarificationQuestion: null };

  for (const k of MERGE_KEYS) {
    if (MERGE_NULLABLE.has(k)) {
      if (extracted[k] !== undefined) out[k] = extracted[k];
      continue;
    }
    if (extracted[k] !== undefined && extracted[k] !== null) {
      if (k === 'flexibleTime' && extracted.flexibleTime === false && !meta.flexibleTimeExplicit) {
        continue;
      }
      if (k === 'date' && !extracted.dateExplicit && prev?.date) continue;
      if (k === 'dateLabel' && !extracted.dateExplicit && prev?.dateLabel) continue;
      if (k === 'hour' && !extracted.timeExplicit && prev?.hour != null) continue;
      if (k === 'minute' && !extracted.timeExplicit && prev?.minute != null) continue;
      if (k === 'timeRange' && !extracted.timeRangeExplicit && prev?.timeRange) continue;
      if (k === 'afterHour' && !extracted.timeExplicit && prev?.afterHour != null) continue;
      if (k === 'beforeHour' && !extracted.timeExplicit && prev?.beforeHour != null) continue;
      if (k === 'slotDurationHours' && !extracted.durationExplicit && prev?.slotDurationHours) {
        continue;
      }
      if (k === 'repeatPreviousPitch' && !extracted.repeatPreviousPitch) continue;
      if (k === 'districtExplicit' && !extracted.districtExplicit) continue;
      if (k === 'district' && !extracted.districtExplicit && prev?.district) continue;
      out[k] = extracted[k];
    }
  }

  if (extracted.alternateDates?.length) {
    out.alternateDates = extracted.alternateDates;
  }
  if (extracted.preferences !== undefined) {
    out.preferences = extracted.preferences || [];
  }
  if (extracted.searchAnywhere) out.searchAnywhere = true;
  if (extracted.dateExplicit) out.dateExplicit = true;
  if (extracted.timeExplicit) out.timeExplicit = true;
  if (extracted.timeRangeExplicit) out.timeRangeExplicit = true;
  if (extracted.durationExplicit) out.durationExplicit = true;
  if (extracted.repeatPreviousPitch) out.repeatPreviousPitch = true;
  if (extracted.districtExplicit) out.districtExplicit = true;
  if (meta.sortHint) out.sortBy = meta.sortHint;

  const extractedAmb = extracted.ambiguities || [];
  if (extractedAmb.length) {
    out.ambiguities = [...extractedAmb];
  } else if (extracted.timeExplicit) {
    out.ambiguities = [];
  } else if (prev?.ambiguities?.length) {
    out.ambiguities = [...prev.ambiguities];
  } else {
    out.ambiguities = [];
  }
  out.warnings = [...(extracted.warnings || []), ...(out.warnings || [])];
  out.confidence = extracted.confidence || out.confidence;

  return out;
}

/** سازگاری با API قدیمی recommend */
function toLegacyIntent(full) {
  return {
    date: full.date || '',
    dateLabel: full.dateLabel || 'نزدیک‌ترین روز',
    hour: full.hour,
    minute: full.minute ?? 0,
    womenOnly: full.womenOnly,
    pitchType: full.pitchType,
    zone: full.zone,
    confidence: full.confidence,
  };
}

module.exports = { emptyAssistantIntent, mergeIntentState, intentFromSession, toLegacyIntent };
