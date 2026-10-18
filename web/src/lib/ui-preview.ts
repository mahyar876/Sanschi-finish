import type { SessionUser } from '@/lib/session';

export const UI_PREVIEW_QUERY = 'uiPreview';

/** پیش‌نمایش UI در iframe (/responsive-preview) — بدون OTP واقعی */
export function isUiPreviewSearch(search: string | URLSearchParams): boolean {
  const sp =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return sp.get(UI_PREVIEW_QUERY) === '1';
}

export function isUiPreviewClient(): boolean {
  if (typeof window === 'undefined') return false;
  return isUiPreviewSearch(window.location.search);
}

export function withUiPreview(path: string): string {
  const qIndex = path.indexOf('?');
  const pathname = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const sp = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '');
  sp.set(UI_PREVIEW_QUERY, '1');
  const q = sp.toString();
  return `${pathname}?${q}`;
}

export function previewRoleForPathname(pathname: string): SessionUser['role'] | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (
    pathname.startsWith('/owner') ||
    pathname === '/finance' ||
    pathname.startsWith('/finance/') ||
    pathname === '/settlement'
  ) {
    return 'owner';
  }
  if (pathname.startsWith('/player') || pathname === '/profile') return 'user';
  return null;
}
