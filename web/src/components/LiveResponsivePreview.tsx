'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_NAV,
  OWNER_NAV,
  PLAYER_NAV,
  type NavGroup,
} from '@/lib/dashboard-nav';
import { withUiPreview } from '@/lib/ui-preview';
import { CollapsibleAsideList } from '@/components/CollapsibleFilterSection';

const DEVICES = [
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-13', label: 'iPhone 13', width: 390, height: 844 },
  { id: 'iphone-landscape', label: 'iPhone افقی', width: 844, height: 390 },
  { id: 'ipad-mini', label: 'iPad Mini', width: 768, height: 1024 },
  { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180 },
  { id: 'desktop', label: 'Desktop', width: 1280, height: 800 },
] as const;

type Zone = 'public' | 'player' | 'owner' | 'admin';

type PageDef = { id: string; title: string; path: string };

function pagesFromNav(groups: NavGroup[]): PageDef[] {
  const seen = new Set<string>();
  const out: PageDef[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      out.push({
        id: item.href.replace(/\//g, '_'),
        title: item.label,
        path: withUiPreview(item.href),
      });
    }
  }
  return out;
}

const PUBLIC_PAGES: PageDef[] = [
  { id: 'home', title: 'خانه', path: withUiPreview('/') },
  { id: 'gallery', title: 'گالری زمین‌ها', path: withUiPreview('/gallery') },
  { id: 'assistant', title: 'دستیار رزرو', path: withUiPreview('/assistant') },
  { id: 'reserve', title: 'رزرو سانس', path: withUiPreview('/reserve') },
  { id: 'for-owners', title: 'همکاری / مالک', path: withUiPreview('/for-owners') },
  { id: 'about', title: 'درباره ما', path: withUiPreview('/about') },
  { id: 'terms', title: 'قوانین', path: withUiPreview('/terms') },
  { id: 'privacy', title: 'حریم خصوصی', path: withUiPreview('/privacy') },
  { id: 'login', title: 'ورود / ثبت‌نام', path: withUiPreview('/login') },
  { id: 'penalty', title: 'بازی پنالتی', path: withUiPreview('/penalty') },
  {
    id: 'payment',
    title: 'پرداخت (نمونه)',
    path: withUiPreview(
      '/payment?reservationId=preview&amount=520000&pitchName=Preview&date=1404/07/20&time=18:00-19:30&name=Preview&phone=09120000000',
    ),
  },
];

const PAGES_BY_ZONE: Record<Zone, PageDef[]> = {
  public: PUBLIC_PAGES,
  player: pagesFromNav(PLAYER_NAV),
  owner: pagesFromNav(OWNER_NAV),
  admin: pagesFromNav(ADMIN_NAV),
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
  const [layout, setLayout] = useState<LayoutMode>('mosaic');
  const [iframeKey, setIframeKey] = useState(0);

  const pages = PAGES_BY_ZONE[zone];
  const page = pages[pageIndex] ?? pages[0];
  const device = DEVICES[deviceIndex];

  useEffect(() => {
    setPageIndex(0);
  }, [zone]);

  const reload = useCallback(() => setIframeKey((k) => k + 1), []);

  const openPath = useMemo(() => page.path, [page.path]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setPageIndex((i) => (i + 1) % pages.length);
      if (e.key === 'ArrowRight') setPageIndex((i) => (i - 1 + pages.length) % pages.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages.length]);

  function renderFrame(d: (typeof DEVICES)[number], src: string, title: string) {
    return (
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
            title={title}
            src={src}
            className="responsive-live-iframe"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-live-root">
      <header className="responsive-live-top">
        <div>
          <p className="responsive-live-kicker">پیش‌نمایش زنده · {ZONE_LABEL[zone]}</p>
          <h1 className="responsive-live-title">{page.title}</h1>
          <p className="responsive-live-meta">
            {page.path.replace('uiPreview=1&', '').replace('&uiPreview=1', '').replace('?uiPreview=1', '')}
            {' · '}
            پنل‌ها با ورود نمایشی خودکار (بدون OTP)
          </p>
        </div>
        <div className="responsive-live-toolbar">
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
          <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
            بارگذاری مجدد
          </button>
          <Link href={openPath} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
            باز در تب جدید
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
            {ZONE_LABEL[z]} ({PAGES_BY_ZONE[z].length})
          </button>
        ))}
      </div>

      <div className="responsive-live-body">
        <CollapsibleAsideList
          className="responsive-live-sidebar"
          title={`صفحات · ${ZONE_LABEL[zone]}`}
          summary={page.title}
        >
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
              <p className="responsive-live-sidebar-title">دستگاه · {device.label}</p>
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
        </CollapsibleAsideList>

        <section className="responsive-live-stage">
          {layout === 'mosaic' ? (
            <div className="responsive-live-mosaic">
              {DEVICES.map((d) =>
                renderFrame(d, page.path, `${page.title} — ${d.label}`),
              )}
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
