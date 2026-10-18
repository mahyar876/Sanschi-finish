import { getUser } from '@/lib/session';

export type DemoNotification = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type?: string;
};

function storageKey(phone: string) {
  return `sanschii_notifications_${phone}`;
}

export function loadDemoNotifications(): DemoNotification[] {
  if (typeof window === 'undefined') return [];
  const phone = getUser()?.phone;
  if (!phone) return [];
  try {
    const raw = localStorage.getItem(storageKey(phone));
    return raw ? (JSON.parse(raw) as DemoNotification[]) : [];
  } catch {
    return [];
  }
}

export function pushDemoNotification(input: {
  title: string;
  body: string;
  type?: string;
}) {
  const phone = getUser()?.phone;
  if (!phone) return;
  const list = loadDemoNotifications();
  const row: DemoNotification = {
    _id: `n-${Date.now()}`,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: new Date().toISOString(),
    type: input.type,
  };
  localStorage.setItem(storageKey(phone), JSON.stringify([row, ...list].slice(0, 50)));
}
