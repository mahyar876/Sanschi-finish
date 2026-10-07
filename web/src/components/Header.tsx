'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/session';

const nav = [
  { href: '/', label: 'خانه' },
  { href: '/gallery', label: 'زمین‌ها' },
  { href: '/reserve', label: 'رزرو' },
  { href: '/about', label: 'درباره' },
];

export function Header() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getUser());
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden />
          سانس‌چی
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
        </nav>
        <div className="header-actions">
          {loggedIn ? (
            <Link href="/profile" className="btn btn-ghost btn-sm">
              حساب من
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm">
              ورود
            </Link>
          )}
          <Link href="/reserve" className="btn btn-primary btn-sm">
            رزرو سانس
          </Link>
        </div>
      </div>
    </header>
  );
}
