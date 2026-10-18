'use client';

import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';

type Ticket = {
  _id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminReply?: string;
  createdAt: string;
  repliedAt?: string;
};

const CATEGORIES = [
  { id: 'general', label: 'عمومی' },
  { id: 'booking', label: 'رزرو' },
  { id: 'payment', label: 'پرداخت' },
  { id: 'dispute', label: 'اختلاف / شکایت' },
] as const;

export function PlayerSupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('general');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    void apiFetch<{ success: boolean; tickets: Ticket[] }>('/support/tickets/my').then((d) => {
      if (d.success) setTickets(d.tickets);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    setLoading(true);
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, message, category }),
      });
      if (!data.success) throw new Error(data.message || 'خطا');
      setSubject('');
      setMessage('');
      setOk('درخواست ثبت شد. پاسخ از طریق همین صفحه نمایش داده می‌شود.');
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageIntro
        title="پشتیبانی"
        description="سؤال دربارهٔ رزرو، پرداخت یا اختلاف با مجموعه — تیکت بزنید."
      />
      <DataSection title="تیکت جدید">
        <form className="form-stack" onSubmit={submit}>
          <label>
            دسته
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            موضوع
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} />
          </label>
          <label>
            توضیح
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              rows={5}
            />
          </label>
          {err && <p className="form-msg err">{err}</p>}
          {ok && <p className="form-msg ok">{ok}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            ارسال تیکت
          </button>
        </form>
      </DataSection>
      <DataSection title="تیکت‌های قبلی">
        {tickets.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            هنوز تیکتی ثبت نکرده‌اید.
          </p>
        ) : (
          <ul className="msg-inbox">
            {tickets.map((t) => (
              <li key={t._id} className="msg-inbox-item panel">
                <div className="msg-inbox-head">
                  <strong>{t.subject}</strong>
                  <span className="muted-sm">{t.status}</span>
                </div>
                <p className="msg-inbox-body">{t.message}</p>
                {t.adminReply ? (
                  <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
                    پاسخ پشتیبانی: {t.adminReply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DataSection>
    </>
  );
}
