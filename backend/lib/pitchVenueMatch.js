const VENUE_COORD_CATALOG = require('../data/venueCoordsCatalog');

function nameTokens(s) {
  return String(s)
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function tokenOverlapScore(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  let n = 0;
  for (const t of ta) {
    if (tb.some((u) => u.includes(t) || t.includes(u))) n += 1;
  }
  return n;
}

function matchPitchNameToCoords(pitchName) {
  const name = String(pitchName || '').trim();
  if (!name) return null;

  const exact = VENUE_COORD_CATALOG.find((e) => e.name === name);
  if (exact) return { lat: exact.lat, lng: exact.lng };

  let best = null;
  let bestScore = 0;
  for (const e of VENUE_COORD_CATALOG) {
    const score = tokenOverlapScore(name, e.name);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (best && bestScore >= 2) return { lat: best.lat, lng: best.lng };
  return null;
}

module.exports = { matchPitchNameToCoords, tokenOverlapScore };
