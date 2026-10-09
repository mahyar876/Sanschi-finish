'use client';

import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { PartnerApplicationStatusBanner } from '@/components/PartnerApplicationStatusBanner';
import { isDemoFrontend } from '@/lib/demo';
import { loadDemoNotifications } from '@/lib/demo-notifications';

type NotificationRow = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const DEMO: NotificationRow[] = [
  {
    _id: '1',
    title: 'یادآوری پرداخت',
    body: 'رزرو شما در انتظار پرداخت است.',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

export function PlayerNotificationsView() {
  const [items, setItems] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (isDemoFrontend()) {
      const stored = loadDemoNotifications();
      setItems(stored.length ? stored : DEMO);
      return;
    }
    void apiFetch<{ success: boolean; notifications: NotificationRow[] }>(
      '/notifications/my',
    ).then((data) => {
      if (data.success) setItems(data.notifications);
    });
  }, []);

  async function markRead(id: string) {
    if (isDemoFrontend()) {
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      return;
    }
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', body: '{}' });
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }

  return (
    <>
      <PageIntro
        title="اعلان‌ها"
        description="وضعیت رزرو، پرداخت، و پیام‌های درخواست همکاری (ثبت زمین)."
      />
      <PartnerApplicationStatusBanner />
      <DataSection title="اعلان‌های اخیر">
        <ul className="msg-inbox">
          {items.length === 0 && <p className="notice">اعلانی نیست.</p>}
          {items.map((m) => (
            <li key={m._id} className={`msg-inbox-item panel ${m.read ? '' : 'unread'}`}>
              <div className="msg-inbox-head">
                <strong>{m.title}</strong>
                {!m.read && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => markRead(m._id)}
                  >
                    خواندم
                  </button>
                )}
              </div>
              <p className="msg-inbox-body">{m.body}</p>
            </li>
          ))}
        </ul>
      </DataSection>
    </>
  );
}
