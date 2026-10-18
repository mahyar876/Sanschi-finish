const mongoose = require('mongoose');
const PlatformSettings = require('../models/PlatformSettings');

const SITE_KEY = 'site';
const DEFAULT_HOME_VENUE_PREVIEW_COUNT = 4;
const MIN_HOME_VENUE_PREVIEW = 1;
const MAX_HOME_VENUE_PREVIEW = 12;
const MAX_HOME_FEATURED_PLACEMENTS = 12;

function clampPreviewCount(n) {
  const v = parseInt(n, 10);
  if (Number.isNaN(v)) return DEFAULT_HOME_VENUE_PREVIEW_COUNT;
  return Math.min(MAX_HOME_VENUE_PREVIEW, Math.max(MIN_HOME_VENUE_PREVIEW, v));
}

function normalizePlacement(raw, index) {
  if (!raw || !raw.pitchId || !raw.expiresAt) return null;
  const pitchId = String(raw.pitchId);
  if (!mongoose.Types.ObjectId.isValid(pitchId)) return null;
  const expiresAt = new Date(raw.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  const sortOrder =
    raw.sortOrder !== undefined && raw.sortOrder !== null
      ? parseInt(raw.sortOrder, 10)
      : index;
  return {
    pitchId,
    expiresAt,
    note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 240) : '',
    sortOrder: Number.isNaN(sortOrder) ? index : sortOrder,
  };
}

function normalizePlacements(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < list.length && out.length < MAX_HOME_FEATURED_PLACEMENTS; i++) {
    const row = normalizePlacement(list[i], i);
    if (!row || seen.has(row.pitchId)) continue;
    seen.add(row.pitchId);
    out.push(row);
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out.map((p, i) => ({ ...p, sortOrder: i }));
}

function serializePlacements(placements, { activeOnly = false } = {}) {
  const now = Date.now();
  let rows = placements || [];
  if (activeOnly) {
    rows = rows.filter((p) => new Date(p.expiresAt).getTime() > now);
  }
  return rows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      pitchId: String(p.pitchId),
      expiresAt: new Date(p.expiresAt).toISOString(),
      note: p.note || '',
      sortOrder: p.sortOrder ?? 0,
    }));
}

async function getSiteSettings({ activePlacementsOnly = false } = {}) {
  let doc = await PlatformSettings.findOne({ key: SITE_KEY });
  if (!doc) {
    doc = await PlatformSettings.create({
      key: SITE_KEY,
      homeVenuePreviewCount: DEFAULT_HOME_VENUE_PREVIEW_COUNT,
      homeFeaturedPlacements: [],
    });
  }
  const placements = serializePlacements(doc.homeFeaturedPlacements, {
    activeOnly: activePlacementsOnly,
  });
  return {
    homeVenuePreviewCount: clampPreviewCount(doc.homeVenuePreviewCount),
    homeFeaturedPlacements: placements,
    supportEmail: (doc.supportEmail || 'support@sanschii.ir').trim(),
    supportPhone: (doc.supportPhone || '').trim(),
    supportPhoneDisplay: (doc.supportPhoneDisplay || '').trim(),
    updatedAt: doc.updatedAt,
  };
}

async function updateSiteSettings(patch) {
  const homeVenuePreviewCount =
    patch.homeVenuePreviewCount !== undefined
      ? clampPreviewCount(patch.homeVenuePreviewCount)
      : undefined;

  const update = {};
  if (homeVenuePreviewCount !== undefined) {
    update.homeVenuePreviewCount = homeVenuePreviewCount;
  }
  if (patch.homeFeaturedPlacements !== undefined) {
    update.homeFeaturedPlacements = normalizePlacements(patch.homeFeaturedPlacements);
  }
  if (patch.supportEmail !== undefined) {
    update.supportEmail = String(patch.supportEmail).trim().slice(0, 120) || 'support@sanschii.ir';
  }
  if (patch.supportPhone !== undefined) {
    update.supportPhone = String(patch.supportPhone).trim().slice(0, 32);
  }
  if (patch.supportPhoneDisplay !== undefined) {
    update.supportPhoneDisplay = String(patch.supportPhoneDisplay).trim().slice(0, 48);
  }

  const doc = await PlatformSettings.findOneAndUpdate(
    { key: SITE_KEY },
    { $set: update, $setOnInsert: { key: SITE_KEY } },
    { new: true, upsert: true },
  );

  const result = {
    homeVenuePreviewCount: clampPreviewCount(doc.homeVenuePreviewCount),
    homeFeaturedPlacements: serializePlacements(doc.homeFeaturedPlacements),
    supportEmail: (doc.supportEmail || 'support@sanschii.ir').trim(),
    supportPhone: (doc.supportPhone || '').trim(),
    supportPhoneDisplay: (doc.supportPhoneDisplay || '').trim(),
    updatedAt: doc.updatedAt,
  };

  try {
    const { invalidatePrefix } = require('../lib/shortCache');
    invalidatePrefix('settings:');
  } catch {
    /* ignore */
  }

  return result;
}

module.exports = {
  getSiteSettings,
  updateSiteSettings,
  DEFAULT_HOME_VENUE_PREVIEW_COUNT,
  MIN_HOME_VENUE_PREVIEW,
  MAX_HOME_VENUE_PREVIEW,
  MAX_HOME_FEATURED_PLACEMENTS,
};
