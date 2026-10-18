const { toAsciiDigits } = require('./jalaliTime');
const { TEHRAN_DISTRICTS } = require('./tehranDistrictsData');

function normDistrictText(raw) {
  return toAsciiDigits(String(raw || ''))
    .toLowerCase()
    .replace(/\u200c/g, '')
    .replace(/\s+/g, '');
}

const DISTRICT_CHUNK_BLOCK = new Set([
  'زمین',
  'چمن',
  'فوتسال',
  'سالن',
  'میخوام',
  'میخواهم',
  'برای',
  'فردا',
  'امروز',
  'شب',
  'صبح',
  'عصر',
]);

function chunkMatchesDistrictToken(chunk, token) {
  if (!chunk || !token) return false;
  if (chunk === token) return true;
  if (chunk.includes(token)) return true;
  if (!token.includes(chunk)) return false;
  if (token.endsWith(chunk) && token.length - chunk.length >= 2) return false;
  return chunk.length >= 5;
}

function districtEntriesByMatchLength() {
  const rows = [];
  for (const d of TEHRAN_DISTRICTS) {
    for (const m of d.match) {
      rows.push({ district: d, token: normDistrictText(m) });
    }
  }
  rows.sort((a, b) => b.token.length - a.token.length);
  return rows;
}

const SORTED_MATCH_ROWS = districtEntriesByMatchLength();

function getDistrictDef(key) {
  return TEHRAN_DISTRICTS.find((d) => d.key === key) || null;
}

function districtTehranZone(districtKey) {
  return getDistrictDef(districtKey)?.zone || null;
}

/** پاسخ کوتاه چت (فقط اسم محله) بعد از سؤال محدوده */
function parseStandaloneDistrictReply(text) {
  const raw = toAsciiDigits(String(text || ''))
    .trim()
    .replace(/\u200c/g, ' ');
  if (!raw || raw.length > 48) return null;
  if (/ساعت|شب|عصر|صبح|فردا|پس|امروز|فوتسال|چمن|زمین|میخوام|میخواهم|\d/.test(raw)) {
    return null;
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 3) return null;

  const t = normDistrictText(raw);
  if (t.length < 3) return null;

  for (const d of TEHRAN_DISTRICTS) {
    if (normDistrictText(d.key) === t) {
      return { district: d.key, districtExplicit: true };
    }
  }
  for (const row of SORTED_MATCH_ROWS) {
    if (row.token.length < 3) continue;
    if (t === row.token) {
      return { district: row.district.key, districtExplicit: true };
    }
  }

  if (words.length === 1 && t.length >= 3) {
    return { district: words[0], districtExplicit: true };
  }

  return null;
}

/** @returns {{ district: string, districtExplicit: boolean } | null} */
function parseDistrictFromText(text) {
  const t = normDistrictText(text);

  if (/سعادت/.test(t) && /صادقیه|صادقيه/.test(t)) {
    /* هر دو نام برده — اولویت با عبارت طولانی‌تر در متن خام */
  }

  for (const row of SORTED_MATCH_ROWS) {
    if (row.token.length < 3) continue;
    if (!t.includes(row.token)) continue;
    if (row.district.key === 'سعادت‌آباد' && /صادقیه|صادقيه|sadeghiyeh/.test(t)) continue;
    if (row.district.key === 'صادقیه' && /سعادت/.test(t) && !/صادقیه|صادقيه/.test(t)) continue;
    return { district: row.district.key, districtExplicit: true };
  }

  const raw = toAsciiDigits(String(text || '')).replace(/\u200c/g, ' ');
  const nameChunk = '[\\u0600-\\u06ffa-z\\s]{3,22}';
  const nameWord = '[\\u0600-\\u06ffa-z]{3,18}';
  const patterns = [
    new RegExp(`(?:تو|توی|تو\\s*محدوده|محله|محدوده|اطراف|نزدیک|داخل)\\s+(${nameChunk})`, 'i'),
    new RegExp(`(${nameWord})\\s+(?:میخوام|میخواهم|بگرد|پیدا\\s*کن)`, 'i'),
    new RegExp(`زمین(?:\\s+چمن|\\s+فوتسال)?\\s+(?:تو|توی)?\\s*(${nameWord})`, 'i'),
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    const chunk = normDistrictText(m[1]);
    if (chunk.length < 3 || DISTRICT_CHUNK_BLOCK.has(chunk)) continue;
    for (const row of SORTED_MATCH_ROWS) {
      if (chunkMatchesDistrictToken(chunk, row.token)) {
        return { district: row.district.key, districtExplicit: true };
      }
    }
  }

  return parseStandaloneDistrictReply(text);
}

function pitchSearchBlob(p) {
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : '';
  return normDistrictText(`${p.name || ''} ${p.address || ''} ${tags}`);
}

function pitchMatchesDistrict(p, districtKey) {
  const def = getDistrictDef(districtKey);
  if (!def) {
    const token = normDistrictText(districtKey);
    if (token.length < 3) return false;
    return pitchSearchBlob(p).includes(token);
  }
  const needles = def.addressMatch || def.match;
  const hay = pitchSearchBlob(p);
  return needles.some((n) => {
    const token = normDistrictText(n);
    return token.length >= 3 && hay.includes(token);
  });
}

function districtMatchScore(p, districtKey) {
  if (!pitchMatchesDistrict(p, districtKey)) return -1;
  const def = getDistrictDef(districtKey);
  const hay = pitchSearchBlob(p);
  let score = 10;
  if (def) {
    for (const n of def.addressMatch || []) {
      if (hay.includes(normDistrictText(n))) score += 20;
    }
    if (def.key && hay.includes(normDistrictText(def.key))) score += 15;
  }
  return score;
}

module.exports = {
  TEHRAN_DISTRICTS,
  parseDistrictFromText,
  pitchMatchesDistrict,
  districtMatchScore,
  getDistrictDef,
  districtTehranZone,
};
