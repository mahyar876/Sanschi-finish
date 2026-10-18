/** پروکسی جستجوی آدرس — Nominatim (OpenStreetMap) */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) {
    return Response.json({ success: false, message: 'آدرس خالی است' }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: q.includes('ایران') || q.includes('Iran') ? q : `${q}, Iran`,
    format: 'json',
    limit: '1',
    'accept-language': 'fa',
  });

  const contact =
    process.env.NOMINATIM_CONTACT_EMAIL?.trim() ||
    process.env.SITE_CONTACT_EMAIL?.trim() ||
    'admin@sanschii.local';

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': `SanschiiReserveFootball/1.0 (contact: ${contact})`,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return Response.json({ success: false, message: 'خطا در جستجوی آدرس' }, { status: 502 });
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!data.length) {
      return Response.json({ success: false, message: 'آدرسی پیدا نشد' }, { status: 404 });
    }
    const hit = data[0];
    return Response.json({
      success: true,
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      label: hit.display_name,
    });
  } catch {
    return Response.json({ success: false, message: 'خطا در ارتباط با سرویس نقشه' }, { status: 502 });
  }
}
