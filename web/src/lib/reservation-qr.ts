function siteUrlFromEnv(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** آدرس سایت برای QR (اسکن → باز شدن صفحهٔ تأیید رزرو) */
export function getPublicSiteOrigin(): string {
  const fromEnv = siteUrlFromEnv();
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    // روی لپ‌تاپ localhost است؛ گوشی با اسکن QR به localhost نمی‌رسد — از env LAN/production استفاده کنید
    if (isLocalHostname(hostname) && fromEnv) return fromEnv;
    return origin;
  }
  if (fromEnv) return fromEnv;
  return 'https://sanschii.ir';
}

export function reservationVerifyPath(code: string): string {
  const c = code.trim();
  if (!c || c === '—') return '';
  return `/verify/${encodeURIComponent(c)}`;
}

export function reservationVerifyUrl(code: string): string {
  const path = reservationVerifyPath(code);
  if (!path) return '';
  return `${getPublicSiteOrigin()}${path}`;
}

/** محتوای QR — لینک صفحهٔ تأیید با جزئیات زمین و رزروکننده */
export function reservationQrPayload(code: string): string {
  return reservationVerifyUrl(code);
}

export function qrChartImageUrl(text: string, size = 160): string {
  if (!text) return '';
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=1`;
}
