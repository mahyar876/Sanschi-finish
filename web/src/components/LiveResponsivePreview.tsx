'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DEVICES = [
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-13', label: 'iPhone 13', width: 390, height: 844 },
  { id: 'iphone-landscape', label: 'iPhone افقی', width: 844, height: 390 },
  { id: 'ipad-mini', label: 'iPad Mini', width: 768, height: 1024 },
  { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180 },
  { id: 'desktop', label: 'Desktop', width: 1280, height: 800 },
] as const;

type Zone = 'public' | 'player' | 'owner' | 'admin';

type PageDef = { id: string; title: string; path: string; fullPageHint?: string };

const PAGES_BY_ZONE: Record<Zone, PageDef[]> = {
  public: [
    { id: 'home', title: 'خانه', path: '/' },
    { id: 'gallery', title: 'گالری', path: '/gallery' },
    { id: 'venue', title: 'جزئیات زمین', path: '/gallery/futsal-aria-tehran' },
    { id: 'reserve', title: 'رزرو', path: '/reserve?pitchId=demo-1' },
    { id: 'login', title: 'ورود', path: '/login' },
  ],
  player: [
    {
      id: 'player-home',
      title: 'داشبورد بازیکن',
      path: '/player',
      fullPageHint: '/login?redirect=%2Fplayer',
    },
    { id: 'player-res', title: 'رزروهای من', path: '/player/reservations' },
    { id: 'player-profile', title: 'پروفایل', path: '/player/profile' },
  ],
  owner: [
    {
      id: 'owner-home',
      title: 'داشبورد صاحب زمین',
      path: '/owner',
      fullPageHint: '/login?redirect=%2Fowner',
    },
    { id: 'owner-res', title: 'رزروها', path: '/owner/reservations' },
    { id: 'owner-slots', title: 'سانس‌ها', path: '/owner/slots' },
  ],
  admin: [
    {
      id: 'admin-home',
      title: 'داشبورد مالک',
      path: '/admin',
      fullPageHint: '/login?redirect=%2Fadmin',
    },
    { id: 'admin-pitches', title: 'زمین‌ها', path: '/admin/pitches' },
    { id: 'admin-res', title: 'رزروها', path: '/admin/reservations' },
  ],
};

const ZONE_LABEL: Record<Zone, string> = {
  public: 'سایت عمومی',
  player: 'بازیکن',
  owner: 'صاحب زمین',
  admin: 'مالک',
};

type LayoutMode = 'mosaic' | 'single';

export function LiveResponsivePreview() {
  const [zone, setZone] = useState<Zone>('public');
  const [pageIndex, setPageIndex] = useState(0);
  const [deviceIndex, setDeviceIndex] = useState(1);
  const [layout, setLayout] = useState<LayoutMode>('single');
  const [iframeKey, setIframeKey] = useState(0);

  const pages = PAGES_BY_ZONE[zone];
  const page = pages[pageIndex] ?? pages[0];
  const device = DEVICES[deviceIndex];
  const isPanel = zone !== 'public';

  useEffect(() => {
    setPageIndex(0);
    if (zone !== 'public') setLayout('single');
  }, [zone]);

  const reload = useCallback(() => setIframeKey((k) => k + 1), []);

  const fullPageLogin = useMemo(() => {
    if (!page.fullPageHint) return null;
    return page.fullPageHint;
  }, [page.fullPageHint]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setPageIndex((i) => (i + 1) % pages.length);
      if (e.key === 'ArrowRight') setPageIndex((i) => (i - 1 + pages.length) % pages.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages.length]);

  return (
    <div className="responsive-live-root">
      <header className="responsive-live-top">
        <div>
          <p className="responsive-live-kicker">پیش‌نمایش زنده · {ZONE_LABEL[zone]}</p>
          <h1 className="responsive-live-title">{page.title}</h1>
          <p className="responsive-live-meta">{page.path}</p>
        </div>
        <div className="responsive-live-toolbar">
          {!isPanel && (
            <div className="responsive-live-mode">
              <button
                type="button"
                className={layout === 'mosaic' ? 'active' : ''}
                onClick={() => setLayout('mosaic')}
              >
                همه دستگاه‌ها
              </button>
              <button
                type="button"
                className={layout === 'single' ? 'active' : ''}
                onClick={() => setLayout('single')}
              >
                یک دستگاه
              </button>
            </div>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
            بارگذاری مجدد
          </button>
          <Link href={page.path} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
            باز در تب کامل (تایپ OTP)
          </Link>
        </div>
      </header>

      <div className="responsive-live-zones" role="tablist" aria-label="بخش‌ها">
        {(Object.keys(PAGES_BY_ZONE) as Zone[]).map((z) => (
          <button
            key={z}
            type="button"
            role="tab"
            aria-selected={zone === z}
            className={zone === z ? 'chip active' : 'chip'}
            onClick={() => setZone(z)}
          >
            {ZONE_LABEL[z]}
          </button>
        ))}
      </div>

      {isPanel && (
        <div className="responsive-live-panel-notice panel">
          <p>
            برای <strong>ورود و تایپ OTP/کد</strong> حتماً «باز در تب کامل» را بزنید — داخل
            iframe چندقابی ممکن است کیبورد درست فوکوس نشود.
          </p>
          {fullPageLogin && (
            <Link href={fullPageLogin} className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer">
              ورود دمو → {ZONE_LABEL[zone]}
            </Link>
          )}
        </div>
      )}

      <div className="responsive-live-body">
        <aside className="responsive-live-sidebar" aria-label="صفحات">
          <p className="responsive-live-sidebar-title">{ZONE_LABEL[zone]}</p>
          <ul>
            {pages.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={i === pageIndex ? 'active' : ''}
                  onClick={() => setPageIndex(i)}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
          {layout === 'single' && (
            <>
              <p className="responsive-live-sidebar-title">دستگاه</p>
              <ul>
                {DEVICES.map((d, i) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={i === deviceIndex ? 'active' : ''}
                      onClick={() => setDeviceIndex(i)}
                    >
                      {d.label}{' '}
                      <span className="muted-sm">
                        {d.width}×{d.height}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section className="responsive-live-stage">
          {layout === 'mosaic' && !isPanel ? (
            <div className="responsive-live-mosaic">
              {DEVICES.map((d) => (
                <div key={d.id} className="responsive-live-unit">
                  <p className="responsive-live-unit-label">
                    {d.label} · {d.width}×{d.height}
                  </p>
                  <div
                    className="responsive-live-frame"
                    style={{ width: d.width, height: Math.min(d.height, 720) }}
                  >
                    <iframe
                      key={`${page.id}-${d.id}-${iframeKey}`}
                      title={`${page.title} — ${d.label}`}
                      src={page.path}
                      className="responsive-live-iframe"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="responsive-live-single">
              <p className="responsive-live-unit-label">
                {device.label} · {device.width}×{device.height}
              </p>
              <div
                className="responsive-live-frame responsive-live-frame-single"
                style={{ width: device.width, height: Math.min(device.height, 820) }}
              >
                <iframe
                  key={`${page.id}-${device.id}-${iframeKey}`}
                  title={`${page.title} — ${device.label}`}
                  src={page.path}
                  className="responsive-live-iframe"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
