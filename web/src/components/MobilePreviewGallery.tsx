'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CollapsibleAsideList } from '@/components/CollapsibleFilterSection';

type PageItem = {
  id: string;
  title: string;
  path: string;
  group: string;
  shot: string;
  needsAuth?: 'user' | 'admin';
};

const PAGES: PageItem[] = [
  { id: 'home', title: 'خانه', path: '/', group: 'عمومی', shot: 'public-_.png' },
  { id: 'gallery', title: 'گالری زمین‌ها', path: '/gallery', group: 'عمومی', shot: 'public-_gallery.png' },
  { id: 'reserve', title: 'رزرو سانس', path: '/reserve', group: 'عمومی', shot: 'public-_reserve.png' },
  { id: 'about', title: 'درباره ما', path: '/about', group: 'عمومی', shot: 'public-_about.png' },
  { id: 'login', title: 'ورود / ثبت‌نام', path: '/login', group: 'عمومی', shot: 'public-_login.png' },
  {
    id: 'penalty',
    title: 'بازی پنالتی',
    path: '/penalty',
    group: 'عمومی',
    shot: 'public-_penalty.png',
  },
  {
    id: 'penalty-frame',
    title: 'پنالتی (فریم بازی)',
    path: '/penalty-frame.html',
    group: 'عمومی',
    shot: 'public-_penalty.png',
  },
  {
    id: 'payment',
    title: 'پرداخت (نمونه)',
    path: '/payment?reservationId=mock-1&amount=520000&pitchName=Test&date=2025-01-01&time=18:00&name=Test',
    group: 'عمومی',
    shot: 'public-_payment.png',
  },
  {
    id: 'user-profile',
    title: 'حساب کاربری',
    path: '/profile',
    group: 'پنل — بازیکن',
    shot: 'user-_profile.png',
    needsAuth: 'user',
  },
  {
    id: 'user-owner',
    title: 'پنل صاحب زمین',
    path: '/owner',
    group: 'پنل — بازیکن',
    shot: 'user-_owner.png',
    needsAuth: 'user',
  },
  {
    id: 'user-finance',
    title: 'گزارش مالی مالک',
    path: '/finance',
    group: 'پنل — بازیکن',
    shot: 'user-_finance.png',
    needsAuth: 'user',
  },
  {
    id: 'user-settlement',
    title: 'تسویه',
    path: '/settlement',
    group: 'پنل — بازیکن',
    shot: 'user-_settlement.png',
    needsAuth: 'user',
  },
  {
    id: 'admin-admin',
    title: 'پنل مالک',
    path: '/admin',
    group: 'پنل — مالک',
    shot: 'admin-_admin.png',
    needsAuth: 'admin',
  },
  {
    id: 'admin-finance',
    title: 'مالی کل',
    path: '/admin/finance',
    group: 'پنل — مالک',
    shot: 'admin-_admin_finance.png',
    needsAuth: 'admin',
  },
  {
    id: 'admin-settlement',
    title: 'تسویه‌ها (مالک)',
    path: '/settlement',
    group: 'پنل — مالک',
    shot: 'admin-_settlement.png',
    needsAuth: 'admin',
  },
];

type Mode = 'live' | 'shot';

export function MobilePreviewGallery() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('live');
  const [iframeKey, setIframeKey] = useState(0);

  const page = PAGES[index];
  const groups = useMemo(() => {
    const order: string[] = [];
    for (const p of PAGES) {
      if (!order.includes(p.group)) order.push(p.group);
    }
    return order;
  }, []);

  const go = useCallback((i: number) => {
    setIndex((i + PAGES.length) % PAGES.length);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(index + 1);
      if (e.key === 'ArrowRight') go(index - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  const shotSrc = `/dev/mobile-screens/${page.shot}`;

  return (
    <div className="mobile-preview-root">
      <header className="mobile-preview-top">
        <div>
          <p className="mobile-preview-kicker">پیش‌نمایش موبایل · iPhone 13 (390px)</p>
          <h1 className="mobile-preview-title">{page.title}</h1>
          <p className="mobile-preview-meta">
            {index + 1} از {PAGES.length} — {page.group}
          </p>
        </div>
        <div className="mobile-preview-mode">
          <button
            type="button"
            className={mode === 'live' ? 'active' : ''}
            onClick={() => setMode('live')}
          >
            زنده
          </button>
          <button
            type="button"
            className={mode === 'shot' ? 'active' : ''}
            onClick={() => setMode('shot')}
          >
            اسکرین‌شات تست
          </button>
        </div>
      </header>

      <div className="mobile-preview-body">
        <CollapsibleAsideList
          className="mobile-preview-list"
          title="فهرست صفحات"
          summary={page.title}
        >
          {groups.map((group) => (
            <div key={group} className="mobile-preview-group">
              <p className="mobile-preview-group-title">{group}</p>
              <ul>
                {PAGES.filter((p) => p.group === group).map((p) => {
                  const i = PAGES.indexOf(p);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={i === index ? 'active' : ''}
                        onClick={() => setIndex(i)}
                      >
                        {p.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </CollapsibleAsideList>

        <section className="mobile-preview-stage">
          <div className="mobile-preview-phone" aria-label="قاب موبایل">
            <div className="mobile-preview-notch" aria-hidden />
            {mode === 'live' ? (
              <iframe
                key={`${page.id}-${iframeKey}`}
                title={page.title}
                src={page.path}
                className="mobile-preview-iframe"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shotSrc} alt={`اسکرین‌شات ${page.title}`} className="mobile-preview-shot" />
            )}
          </div>

          {mode === 'live' && page.needsAuth && (
            <p className="mobile-preview-hint">
              داخل قاب موبایل ابتدا از لیست «ورود» را انتخاب کنید و «ورود بازیکن» یا «ورود مدیر»
              را بزنید، بعد همین صفحه را دوباره انتخاب کنید. یا حالت «اسکرین‌شات تست» را ببینید.
              <button
                type="button"
                className="mobile-preview-reload"
                onClick={() => setIframeKey((k) => k + 1)}
              >
                بارگذاری مجدد قاب
              </button>
            </p>
          )}

          <div className="mobile-preview-nav">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(index - 1)}>
              → قبلی
            </button>
            <Link href={page.path} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
              باز کردن در تب جدید
            </Link>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(index + 1)}>
              بعدی ←
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
