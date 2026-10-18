/** مختصات مرجع مجموعه‌ها — برای fallback وقتی API هنوز lat/lng ندارد (هم‌خوان با data/venues.ts) */
export type VenueCoordEntry = { name: string; lat: number; lng: number };

export const VENUE_COORD_CATALOG: VenueCoordEntry[] = [
  { name: 'سالن فوتسال آریا', lat: 35.7575, lng: 51.4103 },
  { name: 'سالن والیبال ستاره شرق', lat: 35.7312, lng: 51.5021 },
  { name: 'چمن مصنوعی پارک ملت', lat: 35.7444, lng: 51.4152 },
  { name: 'چمن طبیعی رضایی', lat: 35.7398, lng: 51.5488 },
  { name: 'سالن چندمنظوره امید', lat: 35.7241, lng: 51.3345 },
  { name: 'چمن دانشگاه (شب)', lat: 35.7033, lng: 51.3956 },
  { name: 'فوتسال ستاره شرق', lat: 35.6992, lng: 51.4891 },
  { name: 'سالن والیبال شمال', lat: 35.8042, lng: 51.4258 },
  { name: 'چمن ۷ نفره شمائل', lat: 35.8224, lng: 51.6342 },
  { name: 'چمن پارک سمیه', lat: 35.6478, lng: 51.3812 },
  { name: 'چمن پارک گلچین', lat: 35.6389, lng: 51.4123 },
  { name: 'سالن فوتسال گلچین', lat: 35.6512, lng: 51.3789 },
  { name: 'سالن چندمنظوره نواب صفوی', lat: 35.6495, lng: 51.3845 },
  { name: 'سالن والیبال مسگر آباد', lat: 35.6123, lng: 51.4891 },
  { name: 'چمن پیروزی', lat: 35.6992, lng: 51.4891 },
  { name: 'چمن سعادت‌آباد مهر', lat: 35.7812, lng: 51.3654 },
  { name: 'چمن چیتگر', lat: 35.7489, lng: 51.1987 },
  { name: 'چمن افسریه', lat: 35.6412, lng: 51.5012 },
  { name: 'فوتسال ونک', lat: 35.7575, lng: 51.4103 },
  { name: 'فوتسال اکباتان', lat: 35.7211, lng: 51.3123 },
  { name: 'فوتسال تهرانپارس', lat: 35.7398, lng: 51.5488 },
  { name: 'فوتسال پونک', lat: 35.7612, lng: 51.3345 },
  { name: 'والیبال نازی‌آباد', lat: 35.6345, lng: 51.4012 },
  { name: 'والیبال شهرک غرب', lat: 35.7556, lng: 51.3678 },
  { name: 'والیبال تهراننو', lat: 35.7123, lng: 51.5234 },
  { name: 'والیبال رسالت', lat: 35.7345, lng: 51.4789 },
  { name: 'چندمنظوره ستاری', lat: 35.7189, lng: 51.3567 },
  { name: 'چندمنظوره شهرری', lat: 35.5934, lng: 51.4456 },
  { name: 'چندمنظوره هفت‌حوز', lat: 35.6912, lng: 51.4234 },
  { name: 'چندمنظوره زعفرانیه', lat: 35.8012, lng: 51.4123 },
];

function nameTokens(s: string): string[] {
  return s
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function tokenOverlapScore(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  let n = 0;
  for (const t of ta) {
    if (tb.some((u) => u.includes(t) || t.includes(u))) n += 1;
  }
  return n;
}

/** وقتی pitch در DB lat/lng ندارد، از نام نزدیک‌ترین مجموعه در کاتالوگ حدس بزن */
export function matchPitchNameToCoords(
  pitchName: string,
): { lat: number; lng: number } | null {
  const name = pitchName.trim();
  if (!name) return null;

  const exact = VENUE_COORD_CATALOG.find((e) => e.name === name);
  if (exact) return { lat: exact.lat, lng: exact.lng };

  let best: VenueCoordEntry | null = null;
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
