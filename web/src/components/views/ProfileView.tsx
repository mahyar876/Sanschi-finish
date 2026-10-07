'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/fetch-api';
import { getUser, type SessionUser } from '@/lib/session';
import { priceFa } from '@/lib/format';

type Reservation = {
  _id: string;
  code: string;
  status: string;
  date: string;
  slotTime: string;
  amount: number;
  pitch?: { name: string };
};

const STATUS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  cancelled: 'لغو شده',
};

export function ProfileView() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    setUser(u);
    setName(u.name);
    setEmail(u.email || '');
    void loadReservations();
  }, [router]);

  async function loadReservations() {
    try {
      const data = await apiFetch<{ success: boolean; reservations: Reservation[] }>(
        '/reservations/my',
      );
      if (data.success) setReservations(data.reservations);
    } catch {
      /* ignore */
    }
  }

  async function saveProfile() {
    setMsg('');
    try {
      const data = await apiFetch<{ success: boolean; user: SessionUser; message?: string }>(
        '/auth/me',
        { method: 'PATCH', body: JSON.stringify({ name, email: email || null }) },
      );
      if (!data.success) throw new Error(data.message);
      setUser(data.user);
      setMsg('ذخیره شد');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    }
  }

  async function cancelReservation(id: string) {
    if (!confirm('این رزرو لغو شود؟')) return;
    await apiFetch(`/reservations/${id}`, { method: 'DELETE' });
    void loadReservations();
  }

  const nav = [
    { href: '/profile', label: 'پروفایل' },
    { href: '/finance', label: 'مالی (مالک)' },
    { href: '/owner', label: 'پنل مالک' },
    { href: '/admin', label: 'مدیریت' },
  ];

  return (
    <DashboardShell title="حساب کاربری" subtitle="اطلاعات شخصی و رزروهای شما" nav={nav}>
      <div className="stat-row">
        <div className="stat-card">
          <div className="label">نام</div>
          <div className="value">{user?.name || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">نقش</div>
          <div className="value">{user?.role === 'admin' ? 'مدیر' : 'کاربر'}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <h2>ویرایش پروفایل</h2>
        <div className="field">
          <label>نام</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>ایمیل</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={saveProfile}>
          ذخیره
        </button>
        {msg && <p className="form-msg ok">{msg}</p>}
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>رزروهای من</h2>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>کد</th>
              <th>مجموعه</th>
              <th>تاریخ</th>
              <th>سانس</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: 'var(--text-muted)' }}>
                  رزروی ثبت نشده —{' '}
                  <Link href="/reserve" style={{ color: 'var(--accent-hover)' }}>
                    رزرو کنید
                  </Link>
                </td>
              </tr>
            )}
            {reservations.map((r) => (
              <tr key={r._id}>
                <td>{r.code}</td>
                <td>{r.pitch?.name || '—'}</td>
                <td>{r.date}</td>
                <td>{r.slotTime}</td>
                <td>{priceFa(r.amount)}</td>
                <td>
                  <span className={`badge ${r.status}`}>{STATUS[r.status] || r.status}</span>
                </td>
                <td>
                  {r.status === 'pending' && (
                    <>
                      <Link
                        href={`/payment?reservationId=${r._id}&amount=${r.amount}&pitchName=${encodeURIComponent(r.pitch?.name || '')}&date=${r.date}&time=${encodeURIComponent(r.slotTime)}`}
                        className="btn btn-primary btn-sm"
                        style={{ marginLeft: 4 }}
                      >
                        پرداخت
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => cancelReservation(r._id)}
                      >
                        لغو
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
