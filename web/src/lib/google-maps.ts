/** مرکز پیش‌فرض (تهران) وقتی موقعیت ثبت نشده */
export const DEFAULT_MAP_CENTER = { lat: 35.6892, lng: 51.389 };

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || undefined;
}

/** باز کردن موقعیت در Google Maps */
export function googleMapsPlaceUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(`${label}@${lat},${lng}`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** مسیریابی (کاربر فعلی → مقصد) — بدون نیاز به API key */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  const destination = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

/** embed نقشه — با کلید Embed API یا fallback بدون کلید */
export function googleMapsEmbedSrc(lat: number, lng: number, zoom = 16): string {
  const key = getGoogleMapsApiKey();
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}&zoom=${zoom}&language=fa`;
  }
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=fa&z=${zoom}&output=embed`;
}

export type LatLngCoords = { lat: number; lng: number };

export function parseCoords(lat?: number | null, lng?: number | null): LatLngCoords | null {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

export function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return parseCoords(lat, lng) !== null;
}
