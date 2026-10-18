'use client';

import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';

type NotificationRow = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const DEMO_MESSAGES: NotificationRow[] = [
  {
    _id: '1',
    title: 'رزرو جدید',
    body: 'یک رزرو در انتظار پرداخت برای سانس عصر ثبت شد.',
    read: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    _id: '2',
    title: 'تسویه',
    body: 'درخواست تسویه هفته جاری در صف بررسی است.',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

function timeFa(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} دقیقه پیش`;
  if (diff < 86400000) return 'امروز';
  return new Date(iso).toLocaleDateString('fa-IR');
}

export function OwnerMessagesView() {
  const [items, setItems] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (isDemoFrontend()) {
      setItems(DEMO_MESSAGES);
      return;
    }
    void apiFetch<{ success: boolean; notifications: NotificationRow[] }>(
      '/notifications/my',
    )
      .then((d) => {
        if (d.success) setItems(d.notifications);
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <>
      <PageIntro title="پیام‌ها و اعلان‌ها" description="اعلان‌های رزرو، پرداخت و تسویه." />
      <DataSection title="صندوق ورودی">
        {items.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            اعلان جدیدی نیست.
          </p>
        ) : (
          <ul className="msg-inbox">
            {items.map((m) => (
              <li
                key={m._id}
                className={`msg-inbox-item panel ${!m.read ? 'unread' : ''}`}
              >
                <div className="msg-inbox-head">
                  <strong>{m.title}</strong>
                  <span className="muted-sm">{timeFa(m.createdAt)}</span>
                </div>
                <p className="msg-inbox-body">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </DataSection>
    </>
  );
}
