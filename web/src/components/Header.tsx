'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accountHomePath } from '@/lib/account-home';
import { getUser, type SessionUser } from '@/lib/session';

const nav = [
  { href: '/', label: 'خانه' },
  { href: '/gallery', label: 'زمین‌ها' },
  { href: '/assistant', label: 'دستیار' },
  { href: '/reserve', label: 'رزرو' },
  { href: '/penalty', label: 'پنالتی' },
  { href: '/about', label: 'درباره' },
];

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const isHome = pathname === '/';

  return (
    <header className={isHome ? 'site-header site-header-home' : 'site-header'}>
      <div className="header-glow" aria-hidden />
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="سانس‌چی — صفحهٔ اصلی">
          <span className="logo-text">
            <span className="logo-wordmark">سانس‌چی</span>
            <span className="logo-tagline">رزرو آنلاین · چمن و سالن</span>
          </span>
        </Link>
        <nav className="nav" aria-label="منوی اصلی">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/for-owners"
            className={
              pathname === '/for-owners' || pathname.startsWith('/for-owners/')
                ? 'nav-link nav-link-partner active'
                : 'nav-link nav-link-partner'
            }
            title="ثبت زمین و همکاری با سانس‌چی"
          >
            همکاری
          </Link>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
          </button>
          {user ? (
            <Link href={accountHomePath(user.role)} className="btn btn-ghost btn-sm">
              حساب من
            </Link>
          ) : (
            <div className="header-auth-links btn btn-ghost btn-sm">
              <Link href="/login" className="header-auth-link">
                ورود
              </Link>
              <span className="header-auth-sep" aria-hidden>
                /
              </span>
              <Link href="/login?tab=register" className="header-auth-link">
                ثبت‌نام
              </Link>
            </div>
          )}
          <Link href="/reserve" className="btn btn-primary btn-sm">
            رزرو سانس
          </Link>
        </div>
      </div>
      <nav
        id="mobile-nav"
        className={menuOpen ? 'mobile-nav open' : 'mobile-nav'}
        aria-label="منوی موبایل"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              pathname === item.href ? 'mobile-nav-link active' : 'mobile-nav-link'
            }
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/for-owners"
          className={
            pathname === '/for-owners' ? 'mobile-nav-link active' : 'mobile-nav-link'
          }
        >
          همکاری — ثبت زمین
        </Link>
        <Link href="/reserve" className="mobile-nav-link">
          رزرو سانس ←
        </Link>
      </nav>
    </header>
  );
}
