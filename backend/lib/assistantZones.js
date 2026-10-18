const { toAsciiDigits } = require('./jalaliTime');
const { TEHRAN_DISTRICTS } = require('./tehranDistrictsData');

const ZONE_FA = {
  east: 'شرق تهران',
  west: 'غرب تهران',
  north: 'شمال تهران',
  south: 'جنوب تهران',
  center: 'مرکز تهران',
};

function escapeRegexPart(s) {
  return String(s)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\s\\u200c]?')
    .replace(/\u200c/g, '[\\s\\u200c]?');
}

function zoneRegex(zone) {
  const parts = new Set();
  for (const d of TEHRAN_DISTRICTS) {
    if (d.zone !== zone) continue;
    parts.add(escapeRegexPart(d.key));
    for (const m of d.match || []) {
      if (String(m).replace(/\s/g, '').length >= 3) {
        parts.add(escapeRegexPart(m));
      }
    }
  }
  const body = [...parts].sort((a, b) => b.length - a.length).join('|');
  return new RegExp(body, 'i');
}

const EAST = zoneRegex('east');
const WEST = zoneRegex('west');
const NORTH = zoneRegex('north');
const SOUTH = zoneRegex('south');
const CENTER = zoneRegex('center');

/** @param {{ address?: string, name?: string, tags?: string[], lat?: number, lng?: number }} p */
function inferPitchZone(p) {
  const blob = toAsciiDigits(`${p.name || ''} ${p.address || ''} ${(p.tags || []).join(' ')}`);
  if (EAST.test(blob)) return 'east';
  if (WEST.test(blob)) return 'west';
  if (NORTH.test(blob)) return 'north';
  if (SOUTH.test(blob)) return 'south';
  if (CENTER.test(blob)) return 'center';

  const lng = p.lng;
  if (typeof lng === 'number' && Number.isFinite(lng)) {
    if (lng >= 51.48) return 'east';
    if (lng <= 51.32) return 'west';
    if (lng >= 51.42 && lng < 51.48) return 'north';
    if (lng < 51.38) return 'south';
  }

  return 'center';
}

function pitchInZone(p, zone) {
  if (!zone) return true;
  return inferPitchZone(p) === zone;
}

function zoneLabelFa(zone) {
  return ZONE_FA[zone] || zone;
}

module.exports = {
  inferPitchZone,
  pitchInZone,
  zoneLabelFa,
  ZONE_FA,
};
