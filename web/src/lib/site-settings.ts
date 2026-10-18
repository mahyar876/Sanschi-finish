import { apiFetch } from '@/lib/fetch-api';
import { cachedRequest } from '@/lib/request-cache';
import { getToken } from '@/lib/session';



export type HomeFeaturedPlacement = {

  pitchId: string;

  expiresAt: string;

  note?: string;

  sortOrder: number;

};



export type SiteSettings = {

  homeVenuePreviewCount: number;

  homeFeaturedPlacements: HomeFeaturedPlacement[];

  supportEmail?: string;

  supportPhone?: string;

  supportPhoneDisplay?: string;

  updatedAt?: string;

};



export const SITE_SETTINGS_DEFAULTS: SiteSettings = {

  homeVenuePreviewCount: 4,

  homeFeaturedPlacements: [],

};



export const HOME_VENUE_PREVIEW_MIN = 1;

export const HOME_VENUE_PREVIEW_MAX = 12;

export const HOME_FEATURED_PLACEMENTS_MAX = 12;



export const SITE_SETTINGS_STORAGE_KEY = 'sanschii_site_settings';



function clampPreviewCount(n: number): number {

  if (!Number.isFinite(n)) return SITE_SETTINGS_DEFAULTS.homeVenuePreviewCount;

  return Math.min(

    HOME_VENUE_PREVIEW_MAX,

    Math.max(HOME_VENUE_PREVIEW_MIN, Math.round(n)),

  );

}



function normalizePlacements(raw: unknown): HomeFeaturedPlacement[] {

  if (!Array.isArray(raw)) return [];

  const out: HomeFeaturedPlacement[] = [];

  const seen = new Set<string>();

  for (let i = 0; i < raw.length && out.length < HOME_FEATURED_PLACEMENTS_MAX; i++) {

    const row = raw[i] as Partial<HomeFeaturedPlacement>;

    if (!row?.pitchId || !row.expiresAt) continue;

    const pitchId = String(row.pitchId);

    if (seen.has(pitchId)) continue;

    if (Number.isNaN(new Date(row.expiresAt).getTime())) continue;

    seen.add(pitchId);

    out.push({

      pitchId,

      expiresAt: new Date(row.expiresAt).toISOString(),

      note: typeof row.note === 'string' ? row.note : '',

      sortOrder:

        typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)

          ? row.sortOrder

          : out.length,

    });

  }

  return out.sort((a, b) => a.sortOrder - b.sortOrder).map((p, i) => ({ ...p, sortOrder: i }));

}



function parseSiteSettingsPayload(data: {

  homeVenuePreviewCount?: number;

  homeFeaturedPlacements?: unknown;

  supportEmail?: string;

  supportPhone?: string;

  supportPhoneDisplay?: string;

  updatedAt?: string;

}): SiteSettings | null {

  if (typeof data.homeVenuePreviewCount !== 'number') return null;

  return {

    homeVenuePreviewCount: clampPreviewCount(data.homeVenuePreviewCount),

    homeFeaturedPlacements: normalizePlacements(data.homeFeaturedPlacements),

    supportEmail: typeof data.supportEmail === 'string' ? data.supportEmail : undefined,

    supportPhone: typeof data.supportPhone === 'string' ? data.supportPhone : undefined,

    supportPhoneDisplay:

      typeof data.supportPhoneDisplay === 'string' ? data.supportPhoneDisplay : undefined,

    updatedAt: data.updatedAt,

  };

}



function loadLocalSiteSettings(): SiteSettings | null {

  if (typeof window === 'undefined') return null;

  try {

    const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as SiteSettings;

    return {

      homeVenuePreviewCount: clampPreviewCount(parsed.homeVenuePreviewCount),

      homeFeaturedPlacements: normalizePlacements(parsed.homeFeaturedPlacements),

      supportEmail: parsed.supportEmail,

      supportPhone: parsed.supportPhone,

      supportPhoneDisplay: parsed.supportPhoneDisplay,

      updatedAt: parsed.updatedAt,

    };

  } catch {

    return null;

  }

}



function saveLocalSiteSettings(settings: SiteSettings) {

  if (typeof window === 'undefined') return;

  const payload: SiteSettings = {

    homeVenuePreviewCount: clampPreviewCount(settings.homeVenuePreviewCount),

    homeFeaturedPlacements: normalizePlacements(settings.homeFeaturedPlacements),

    supportEmail: settings.supportEmail,

    supportPhone: settings.supportPhone,

    supportPhoneDisplay: settings.supportPhoneDisplay,

    updatedAt: new Date().toISOString(),

  };

  localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(payload));

  return payload;

}



/** صفحهٔ اصلی — بدون توکن؛ جایگاه‌های منقضی‌شده فیلتر می‌شوند */

export async function fetchPublicSiteSettings(): Promise<SiteSettings> {
  return cachedRequest('settings:public', 45_000, async () => {
    try {
      const data = await apiFetch<{
        success: boolean;
        homeVenuePreviewCount?: number;
        homeFeaturedPlacements?: HomeFeaturedPlacement[];
        updatedAt?: string;
      }>('/settings/site');

      const settings = parseSiteSettingsPayload(data);

      if (data.success && settings) {
        const now = Date.now();

        settings.homeFeaturedPlacements = settings.homeFeaturedPlacements.filter(
          (p) => new Date(p.expiresAt).getTime() > now,
        );

        saveLocalSiteSettings(settings);
        return settings;
      }
    } catch {
      /* API offline — fallback */
    }

    const local = loadLocalSiteSettings() ?? SITE_SETTINGS_DEFAULTS;
    const now = Date.now();

    return {
      ...local,
      homeFeaturedPlacements: local.homeFeaturedPlacements.filter(
        (p) => new Date(p.expiresAt).getTime() > now,
      ),
    };
  });
}



export async function fetchAdminSiteSettings(): Promise<SiteSettings> {
  const token = getToken();
  if (token?.startsWith('demo-token')) {
    return loadLocalSiteSettings() ?? SITE_SETTINGS_DEFAULTS;
  }

  try {

    const data = await apiFetch<{

      success: boolean;

      homeVenuePreviewCount?: number;

      homeFeaturedPlacements?: HomeFeaturedPlacement[];

      updatedAt?: string;

    }>('/admin/site-settings');

    const settings = parseSiteSettingsPayload(data);

    if (data.success && settings) {

      saveLocalSiteSettings(settings);

      return settings;

    }

  } catch {

    /* fallback */

  }

  return loadLocalSiteSettings() ?? SITE_SETTINGS_DEFAULTS;

}



export async function saveAdminSiteSettings(

  settings: SiteSettings,

): Promise<SiteSettings> {
  const token = getToken();
  if (token?.startsWith('demo-token')) {
    const local: SiteSettings = {
      homeVenuePreviewCount: clampPreviewCount(settings.homeVenuePreviewCount),
      homeFeaturedPlacements: normalizePlacements(settings.homeFeaturedPlacements),
    };
    return saveLocalSiteSettings(local) ?? local;
  }

  const payload: SiteSettings = {

    homeVenuePreviewCount: clampPreviewCount(settings.homeVenuePreviewCount),

    homeFeaturedPlacements: normalizePlacements(settings.homeFeaturedPlacements),

    supportEmail: settings.supportEmail,

    supportPhone: settings.supportPhone,

    supportPhoneDisplay: settings.supportPhoneDisplay,

  };

  try {

    const data = await apiFetch<{

      success: boolean;

      homeVenuePreviewCount?: number;

      homeFeaturedPlacements?: HomeFeaturedPlacement[];

      supportEmail?: string;

      supportPhone?: string;

      supportPhoneDisplay?: string;

      updatedAt?: string;

    }>('/admin/site-settings', {

      method: 'PATCH',

      body: JSON.stringify(payload),

    });

    const saved = parseSiteSettingsPayload(data);

    if (data.success && saved) {

      saveLocalSiteSettings(saved);

      return saved;

    }

  } catch {

    /* ذخیرهٔ محلی برای پیش‌نمایش بدون بک‌اند */

  }

  return saveLocalSiteSettings(payload) ?? payload;

}



export function activeFeaturedPlacements(

  placements: HomeFeaturedPlacement[],

  now: Date = new Date(),

): HomeFeaturedPlacement[] {

  const t = now.getTime();

  return placements

    .filter((p) => new Date(p.expiresAt).getTime() > t)

    .sort((a, b) => a.sortOrder - b.sortOrder);

}



export function orderCatalogForHome<T extends { pitchId: string; featured?: boolean }>(

  items: T[],

  placements: HomeFeaturedPlacement[] = [],

): T[] {

  const active = activeFeaturedPlacements(placements);

  const byId = new Map(items.map((v) => [v.pitchId, v]));

  const out: T[] = [];

  const used = new Set<string>();



  for (const pl of active) {

    const v = byId.get(pl.pitchId);

    if (v && !used.has(pl.pitchId)) {

      out.push(v);

      used.add(pl.pitchId);

    }

  }



  const rest = items.filter((v) => !used.has(v.pitchId));

  for (const v of [...rest.filter((x) => x.featured), ...rest.filter((x) => !x.featured)]) {

    if (used.has(v.pitchId)) continue;

    out.push(v);

    used.add(v.pitchId);

  }



  return out;

}


