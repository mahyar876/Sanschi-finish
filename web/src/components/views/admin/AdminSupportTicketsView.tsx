'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';

type Ticket = {
  _id: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string;
  category: string;
  createdAt: string;
  user?: { name?: string; phone?: string; email?: string };
};

export function AdminSupportTicketsView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('open');
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    void apiFetch<{ success: boolean; tickets: Ticket[] }>(`/support/tickets${q}`).then((d) => {
      if (d.success) setTickets(d.tickets);
    });
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendReply(id: string) {
    const adminReply = replyDraft[id]?.trim();
    if (!adminReply) return;
    await apiFetch(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ adminReply, status: 'in_progress' }),
    });
    setReplyDraft((d) => ({ ...d, [id]: '' }));
    load();
  }

  return (
    <>
      <PageIntro title="تیکت‌های پشتیبانی" description="پاسخ به بازیکنان و بستن درخواست‌ها." />
      <div className="chips" style={{ marginBottom: '1rem' }}>
        {(['open', 'in_progress', 'closed', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={filter === s ? 'chip active' : 'chip'}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <DataSection title="لیست">
        {tickets.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            تیکتی نیست.
          </p>
        ) : (
          <ul className="msg-inbox">
            {tickets.map((t) => (
              <li key={t._id} className="msg-inbox-item panel">
                <div className="msg-inbox-head">
                  <strong>{t.subject}</strong>
                  <span className="muted-sm">{t.status}</span>
                </div>
                <p className="muted-sm">
                  {t.user?.name || '—'} · {t.user?.phone || t.user?.email || ''} · {t.category}
                </p>
                <p className="msg-inbox-body">{t.message}</p>
                {t.adminReply ? (
                  <p className="muted-sm">پاسخ: {t.adminReply}</p>
                ) : (
                  <div className="form-stack" style={{ marginTop: '0.75rem' }}>
                    <textarea
                      rows={3}
                      placeholder="پاسخ پشتیبانی…"
                      value={replyDraft[t._id] || ''}
                      onChange={(e) =>
                        setReplyDraft((d) => ({ ...d, [t._id]: e.target.value }))
                      }
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => sendReply(t._id)}>
                      ثبت پاسخ
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataSection>
    </>
  );
}
