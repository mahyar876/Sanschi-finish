'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  breadcrumbLabel,
  navForRole,
  panelRoleLabel,
  type NavGroup,
} from '@/lib/dashboard-nav';
import { ownerRedirectFromPlayerPath } from '@/lib/account-home';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import { clearSession, getToken, getUser, setSession, type SessionUser } from '@/lib/session';
import { demoLoginAs } from '@/lib/demo';
import { isUiPreviewClient, previewRoleForPathname } from '@/lib/ui-preview';
import { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  requireRole?: 'admin' | 'owner' | 'any';
  navOverride?: NavGroup[];
  preferOwnerNav?: boolean;
};

export function DashboardAppShell({
  children,
  requireRole = 'any',
  navOverride,
  preferOwnerNav = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuQuery, setMenuQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      if (process.env.NODE_ENV !== 'production' && isUiPreviewClient()) {
        const previewRole = previewRoleForPathname(pathname);
        if (previewRole) {
          demoLoginAs(previewRole);
          setUser(getUser());
          return;
        }
      }

      const token = getToken();
      const cached = getUser();
      if (!token || !cached) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      let u = cached;
      if (!token.startsWith('demo-token')) {
        try {
          const data = await apiFetch<{
            success: boolean;
            user?: SessionUser & { id: string };
          }>('/auth/me');
          if (data.user) {
            u = { ...data.user, id: data.user.id };
            setSession(token, u);
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            clearSession();
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
          }
          /* offline — همان session محلی */
        }
      }

      if (cancelled) return;

      if (requireRole === 'admin' && u.role !== 'admin') {
        router.replace(u.role === 'owner' ? '/owner' : '/player');
        return;
      }
      if (requireRole === 'owner' && u.role !== 'owner' && u.role !== 'admin') {
        router.replace('/player');
        return;
      }
      if (u.role === 'owner') {
        const ownerHome = ownerRedirectFromPlayerPath(pathname);
        if (ownerHome) {
          router.replace(ownerHome);
          return;
        }
      }
      setUser(u);
    }

    void syncUser();
    return () => {
      cancelled = true;
    };
  }, [pathname, requireRole, router]);

  const nav = useMemo(() => {
    if (navOverride) return navOverride;
    if (!user) return [];
    if (preferOwnerNav && user.role === 'owner') {
      return navForRole('owner');
    }
    if (pathname.startsWith('/player')) {
      return navForRole('user');
    }
    const role =
      user.role === 'admin' ? 'admin' : user.role === 'owner' ? 'owner' : 'user';
    return navForRole(role);
  }, [navOverride, user, preferOwnerNav, pathname]);

  const filteredNav = useMemo(() => {
    const q = menuQuery.trim();
    if (!q) return nav;
    return nav
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.label.includes(q) || g.title.includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [nav, menuQuery]);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    nav.forEach((g) => {
      initial[g.id] = g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
    });
    setOpenGroups((prev) => ({ ...initial, ...prev }));
  }, [nav, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

  const navRole =
    user.role === 'admin' ? 'admin' : user.role === 'owner' ? 'owner' : 'user';

  const activePanelRole: 'admin' | 'owner' | 'user' = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/owner')
      ? 'owner'
      : pathname.startsWith('/player')
        ? navRole === 'user'
          ? 'user'
          : navRole
        : navRole;

  const accountRoleLabel = panelRoleLabel(navRole);
  const panelBreadcrumb = panelRoleLabel(activePanelRole);

  const ownerPanel =
    requireRole === 'owner' || (requireRole === 'any' && activePanelRole === 'owner');

  return (
    <div className={ownerPanel ? 'dash-app owner-dash' : 'dash-app'}>
      <button
        type="button"
        className={`dash-sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        aria-label="بستن منو"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`dash-app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <Link href="/" className="dash-brand">
          سانس‌چی
        </Link>
        <input
          type="search"
          className="dash-menu-search"
          placeholder="جستجو در منو…"
          value={menuQuery}
          onChange={(e) => setMenuQuery(e.target.value)}
          aria-label="جستجو در منو"
        />
        <nav className="dash-app-nav">
          {filteredNav.map((group) => {
            const open = openGroups[group.id] ?? true;
            const single = group.items.length === 1 && !group.subtitle;
            if (single) {
              const item = group.items[0];
              return (
                <Link
                  key={group.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'dash-app-link active'
                      : 'dash-app-link'
                  }
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={group.id} className="dash-nav-group">
                <button
                  type="button"
                  className="dash-nav-group-head"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                >
                  <span>
                    <strong>{group.title}</strong>
                    {group.subtitle && (
                      <small className="dash-nav-group-sub">{group.subtitle}</small>
                    )}
                  </span>
                  <span className="dash-nav-chevron">{open ? '▾' : '◂'}</span>
                </button>
                {open && (
                  <div className="dash-nav-group-items">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'dash-app-link active'
                            : 'dash-app-link'
                        }
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="dash-app-user-card panel">
          <div className="dash-app-user-name">{user.name}</div>
          <div className="dash-app-user-role">{accountRoleLabel}</div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            خروج
          </button>
        </div>
      </aside>

      <div className="dash-app-main-wrap">
        <header className="dash-app-topbar">
          <button
            type="button"
            className="dash-menu-toggle"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'بستن منوی پنل' : 'باز کردن منوی پنل'}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            ☰
          </button>
          <div className="dash-breadcrumb">
            <span className="dash-bc-muted">{panelBreadcrumb}</span>
            <span aria-hidden>/</span>
            <span>{breadcrumbLabel(pathname)}</span>
          </div>
          <div className="dash-topbar-actions">
            <span className="dash-top-user">{user.name}</span>
            <Link href="/" className="btn btn-ghost btn-sm">
              سایت
            </Link>
          </div>
        </header>
        <main className="dash-app-main">{children}</main>
      </div>
    </div>
  );
}

/** سازگاری با importهای قدیمی */
export function DashboardShell(props: {
  title: string;
  subtitle?: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
  requireRole?: 'admin' | 'owner' | 'any';
}) {
  const groups: NavGroup[] = [
    {
      id: 'legacy',
      title: 'منو',
      items: props.nav,
    },
  ];
  return (
    <DashboardAppShell requireRole={props.requireRole} navOverride={groups}>
      <header className="dash-page-intro">
        <div>
          <h1 className="dash-page-title">{props.title}</h1>
          {props.subtitle && <p className="dash-page-desc">{props.subtitle}</p>}
        </div>
      </header>
      {props.children}
    </DashboardAppShell>
  );
}
