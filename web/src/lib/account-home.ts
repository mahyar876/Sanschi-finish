import type { SessionUser } from '@/lib/session';

const PANEL_ROOT_PATHS = new Set(['/player', '/owner', '/admin']);

/** مسیر بعد از ورود/ثبت‌نام: پیش‌فرض سایت عمومی، مگر redirect برای ادامهٔ همان جریان (رزرو، پرداخت، …) */
export function pathAfterAuth(redirectParam: string | null): string {
  const siteHome = '/';
  if (!redirectParam) return siteHome;
  const r = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;
  if (PANEL_ROOT_PATHS.has(r)) return siteHome;
  return r;
}

export function accountHomePath(role: SessionUser['role']): string {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  return '/player';
}

export function profilePath(role: SessionUser['role']): string {
  if (role === 'owner') return '/owner/profile';
  return '/player/profile';
}

/** صاحب زمین نباید در پنل بازیکن گیر کند — مسیرهای پیش‌فرض به پنل مالک */
export function ownerRedirectFromPlayerPath(pathname: string): string | null {
  const map: Record<string, string> = {
    '/player': '/owner',
    '/player/notifications': '/owner/messages',
    '/player/profile': '/owner/profile',
  };
  return map[pathname] ?? null;
}
