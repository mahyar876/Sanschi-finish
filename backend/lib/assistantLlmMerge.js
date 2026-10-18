const { emptyAssistantIntent } = require('./assistantIntent');

/**
 * ادغام پاسخ JSON سرویس LLM (در صورت پشتیبانی) با intent قواعد.
 * @param {Record<string, unknown> | null} payload
 */
function mapLlmPayloadToIntent(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const out = emptyAssistantIntent();
  let any = false;

  const date = payload.date || payload.targetDate;
  if (typeof date === 'string' && /^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
    out.date = date;
    out.dateLabel = String(payload.dateLabel || payload.date_label || date);
    out.dateExplicit = true;
    any = true;
  }

  const hour = payload.hour ?? payload.startHour;
  if (hour != null && Number.isFinite(Number(hour))) {
    out.hour = parseInt(String(hour), 10);
    out.minute = parseInt(String(payload.minute ?? 0), 10) || 0;
    out.timeExplicit = true;
    any = true;
  }

  const pitchType = payload.pitchType || payload.pitch_type;
  if (pitchType === 'grass' || pitchType === 'futsal') {
    out.pitchType = pitchType;
    out.venueCategory = pitchType;
    any = true;
  } else if (pitchType === 'volleyball' || pitchType === 'multi') {
    out.pitchType = 'futsal';
    out.venueCategory = pitchType;
    any = true;
  }

  const district = payload.district || payload.area;
  if (typeof district === 'string' && district.trim()) {
    out.district = district.trim().slice(0, 48);
    any = true;
  }

  if (payload.womenOnly === true || payload.women_only === true) {
    out.womenOnly = true;
    any = true;
  }

  if (payload.repeatPreviousPitch === true || payload.repeat_previous === true) {
    out.repeatPreviousPitch = true;
    any = true;
  }

  return any ? out : null;
}

module.exports = { mapLlmPayloadToIntent };
