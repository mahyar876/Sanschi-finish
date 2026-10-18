'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  DEV_PANEL_TARGETS,
  devBootPanelPath,
  isDevPanelBootAllowed,
} from '@/lib/dev-panels';

const WINDOW_FEATURES =
  'noopener,noreferrer,width=1320,height=900,menubar=no,toolbar=no,location=yes,status=no';

export default function DevPanelsLauncherPage() {
  const opened = useRef(false);

  useEffect(() => {
    if (!isDevPanelBootAllowed() || opened.current) return;
    opened.current = true;

    for (const panel of DEV_PANEL_TARGETS) {
      window.open(devBootPanelPath(panel.role), `sanschii-${panel.role}`, WINDOW_FEATURES);
    }
  }, []);

  if (!isDevPanelBootAllowed()) {
    return (
      <div className="auth-wrap" style={{ padding: '2rem' }}>
        <p>این صفحه فقط در حالت development در دسترس است.</p>
        <Link href="/">بازگشت به خانه</Link>
      </div>
    );
  }

  return (
    <div className="auth-wrap" style={{ padding: '2rem', maxWidth: '32rem', margin: '0 auto' }}>
      <header className="page-hero" style={{ border: 'none', paddingTop: '0.5rem' }}>
        <h1>باز کردن همزمان پنل‌ها</h1>
        <p className="subtitle">
          سه پنجره جدا (ادمین، مالک، بازیکن) باید باز شده باشد. هر پنجره session
          مستقل دارد.
        </p>
      </header>
      <div className="auth-card">
        <p className="muted-sm" style={{ marginBottom: '1rem' }}>
          ورود نمایشی لوکال — برای دادهٔ واقعی API در هر پنجره از{' '}
          <Link href="/login">صفحه ورود</Link> با حساب جدا وارد شوید.
        </p>
        <div className="hero-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {DEV_PANEL_TARGETS.map((panel) => (
            <button
              key={panel.role}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                window.open(devBootPanelPath(panel.role), `sanschii-${panel.role}`, WINDOW_FEATURES)
              }
            >
              باز کردن {panel.title}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              for (const panel of DEV_PANEL_TARGETS) {
                window.open(
                  devBootPanelPath(panel.role),
                  `sanschii-${panel.role}`,
                  WINDOW_FEATURES,
                );
              }
            }}
          >
            باز کردن هر سه پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
