/** اعتبارسنجی و نرمال‌سازی lat/lng برای زمین */

function parseCoord(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return NaN;
  return n;
}

function isValidCoordPair(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

const INVALID_MSG =
  'مختصات جغرافیایی نامعتبر است؛ عرض بین −۹۰ تا ۹۰ و طول بین −۱۸۰ تا ۱۸۰ باشد';

/**
 * اگر lat/lng در body باشد: جفت معتبر، یا هر دو null/خالی برای پاک‌کردن.
 * @throws Error با code INVALID_COORDS
 */
function sanitizeCoordsInBody(body) {
  if (!body || typeof body !== 'object') return body;
  const hasLat = Object.prototype.hasOwnProperty.call(body, 'lat');
  const hasLng = Object.prototype.hasOwnProperty.call(body, 'lng');
  if (!hasLat && !hasLng) return body;

  const out = { ...body };
  const latRaw = parseCoord(out.lat);
  const lngRaw = parseCoord(out.lng);

  const clearing =
    (out.lat === null || out.lat === undefined || out.lat === '') &&
    (out.lng === null || out.lng === undefined || out.lng === '');

  if (clearing) {
    out.lat = null;
    out.lng = null;
    return out;
  }

  if (Number.isNaN(latRaw) || Number.isNaN(lngRaw)) {
    const err = new Error(INVALID_MSG);
    err.code = 'INVALID_COORDS';
    throw err;
  }

  if (!isValidCoordPair(latRaw, lngRaw)) {
    const err = new Error(INVALID_MSG);
    err.code = 'INVALID_COORDS';
    throw err;
  }

  out.lat = latRaw;
  out.lng = lngRaw;
  return out;
}

function applyCoordsPatchToPitch(pitch, body) {
  if (!body || typeof body !== 'object') return;
  if (!Object.prototype.hasOwnProperty.call(body, 'lat') &&
      !Object.prototype.hasOwnProperty.call(body, 'lng')) {
    return;
  }
  if (body.lat === null && body.lng === null) {
    pitch.set('lat', undefined);
    pitch.set('lng', undefined);
    return;
  }
  if (body.lat !== undefined) pitch.lat = body.lat;
  if (body.lng !== undefined) pitch.lng = body.lng;
}

function coordErrorResponse(err, res) {
  if (err && err.code === 'INVALID_COORDS') {
    return res.status(400).json({ success: false, message: err.message });
  }
  return null;
}

module.exports = {
  isValidCoordPair,
  sanitizeCoordsInBody,
  applyCoordsPatchToPitch,
  coordErrorResponse,
};
