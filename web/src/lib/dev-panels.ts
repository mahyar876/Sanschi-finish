import type { SessionUser } from '@/lib/session';

/** ورود سریع لوکال — فقط برای باز کردن همزمان چند پنل در توسعه */
export function isDevPanelBootAllowed(): boolean {
  return process.env.NODE_ENV === 'development';
}

export type DevPanelRole = SessionUser['role'];

export const DEV_PANEL_TARGETS: {
  role: DevPanelRole;
  title: string;
  home: string;
}[] = [
  { role: 'admin', title: 'پنل ادمین', home: '/admin' },
  { role: 'owner', title: 'پنل مالک زمین', home: '/owner' },
  { role: 'user', title: 'پنل بازیکن', home: '/player' },
];

export function devBootPanelPath(role: DevPanelRole): string {
  return `/dev/boot-panel?role=${role}`;
}
