'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getUser } from '@/lib/session';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/session';

type NavItem = { href: string; label: string };

type Props = {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  children: React.ReactNode;
  requireRole?: 'admin' | 'owner' | 'any';
};

export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
  requireRole = 'any',
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (requireRole === 'admin' && u.role !== 'admin') {
      router.replace('/profile');
      return;
    }
    setUser(u);
  }, [pathname, requireRole, router]);

  function logout() {
    clearSession();
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="page page-narrow">
        <p className="subtitle">در حال بررسی دسترسی…</p>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <Link href="/" className="dash-brand">
          سانس‌چی
        </Link>
        <nav className="dash-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'dash-link active' : 'dash-link'}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="dash-user">
          <span>{user.name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            خروج
          </button>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-head">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            بازگشت به سایت
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
