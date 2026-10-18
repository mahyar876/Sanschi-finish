/** امکانات و فیلدهای فیلتر گالری — هم‌خوان با web/src/lib/pitch-catalog-enrichment.ts */

const { buildDefaultPitchRules } = require('./defaultPitchRules');

const TAG_AMENITY = [
  [/پارکینگ/i, 'parking'],
  [/بوفه|کافه|نوشیدنی/i, 'buffet'],
  [/رختکن/i, 'locker_room'],
  [/دوش/i, 'shower'],
  [/تلمبه|پمپ/i, 'pump'],
  [/توپ/i, 'ball_rental'],
  [/تریبون|تماشا/i, 'spectators'],
  [/تهویه/i, 'ventilation'],
  [/سرمای/i, 'cooling'],
  [/گرمای/i, 'heating'],
  [/مربی|کلاس/i, 'coach'],
];

const EXTRA_POOL = [
  'parking',
  'buffet',
  'shower',
  'locker',
  'spectators',
  'ball_rental',
  'pump',
  'cooling',
  'heating',
  'coach',
  'ventilation',
  'water_cooler',
];

function hashKey(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function amenitiesFromTags(tags) {
  const out = new Set();
  for (const t of tags || []) {
    for (const [re, id] of TAG_AMENITY) {
      if (re.test(t)) out.add(id);
    }
  }
  return out;
}

function baseAmenities(type) {
  if (type === 'grass') {
    return ['restroom', 'green_space', 'ball_rental', 'pump', 'spectators'];
  }
  return ['restroom', 'locker_room', 'ventilation', 'water_cooler', 'locker'];
}

function maxCapacityForSize(size) {
  if (size === 11) return 22;
  if (size === 7) return 14;
  return 10;
}

function womenBookingFromHash(h) {
  if (h % 5 === 0) return true;
  if (h % 7 === 0) return false;
  return null;
}

/**
 * @param {{ name?: string, address?: string, type?: string, size?: number, tags?: string[], amenities?: string[] }} p
 */
function enrichDefaultPitch(p) {
  const key = `${p.name || ''}|${p.address || ''}`;
  const h = hashKey(key);
  const type = p.type === 'grass' ? 'grass' : 'futsal';
  const size = p.size === 11 || p.size === 7 || p.size === 5 ? p.size : 5;

  const set = new Set(baseAmenities(type));
  for (const id of amenitiesFromTags(p.tags || [])) set.add(id);
  for (let i = 0; i < EXTRA_POOL.length; i += 1) {
    if ((h >> (i % 12)) & 1) set.add(EXTRA_POOL[i]);
  }
  if (set.size < 4) {
    for (const id of EXTRA_POOL) {
      set.add(id);
      if (set.size >= 5) break;
    }
  }

  const existing = Array.isArray(p.amenities) ? p.amenities.filter(Boolean) : [];
  const amenities = existing.length ? existing : [...set];

  const rulesTrim = typeof p.rulesText === 'string' ? p.rulesText.trim() : '';
  const rulesText = rulesTrim || buildDefaultPitchRules(type, size);

  return {
    ...p,
    amenities,
    maxCapacity: p.maxCapacity != null ? p.maxCapacity : maxCapacityForSize(size),
    womenBookingAllowed:
      p.womenBookingAllowed !== undefined && p.womenBookingAllowed !== null
        ? p.womenBookingAllowed
        : womenBookingFromHash(h),
    rulesText,
  };
}

module.exports = { enrichDefaultPitch, hashKey, maxCapacityForSize };
