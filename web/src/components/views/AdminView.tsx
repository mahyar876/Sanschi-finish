'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoAdminPitches, getDemoAdminReservations } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';

const adminNav = [
  { href: '/admin', label: 'مدیریت' },
  { href: '/admin/finance', label: 'مالی کل' },
  { href: '/admin/penalty', label: 'بازی پنالتی' },
  { href: '/settlement', label: 'تسویه‌ها' },
];

type Pitch = { _id: string; name: string; type: string; isActive: boolean; commissionAmount?: number };
type Reservation = {
  _id: string;
  code: string;
  status: string;
  amount: number;
  user?: { name: string };
  pitch?: { name: string };
};

export function AdminView() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (isDemoFrontend()) {
      setPitches(getDemoAdminPitches());
      setReservations(getDemoAdminReservations());
      return;
    }
    void apiFetch<{ success: boolean; pitches: Pitch[] }>('/pitches?all=1')
      .then((d) => {
        if (d.success) setPitches(d.pitches);
      })
      .catch(() => {
        setPitches(getDemoAdminPitches());
      });
    void apiFetch<{ success: boolean; reservations: Reservation[] }>('/reservations')
      .then((d) => {
        if (d.success) setReservations(d.reservations.slice(0, 30));
      })
      .catch(() => {
        setReservations(getDemoAdminReservations());
      });
  }, []);

  return (
    <DashboardShell
      title="پنل مدیریت"
      subtitle="زمین‌ها، کمیسیون و رزروها"
      nav={adminNav}
      requireRole="admin"
    >
      <div className="stat-row">
        <div className="stat-card">
          <div className="label">تعداد مجموعه</div>
          <div className="value">{pitches.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">رزرو (نمایش)</div>
          <div className="value">{reservations.length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem' }}>مجموعه‌ها</h2>
      <div className="data-table-wrap" style={{ marginBottom: '1.5rem' }}>
        <table className="data-table responsive-stack">
          <thead>
            <tr>
              <th>نام</th>
              <th>نوع</th>
              <th>کارمزد (تومان)</th>
              <th>فعال</th>
            </tr>
          </thead>
          <tbody>
            {pitches.map((p) => (
              <tr key={p._id}>
                <td data-label="نام">{p.name}</td>
                <td data-label="نوع">{p.type}</td>
                <td data-label="کارمزد">{priceFa(p.commissionAmount ?? 0)}</td>
                <td data-label="فعال">{p.isActive ? 'بله' : 'خیر'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: '1rem' }}>آخرین رزروها</h2>
      <div className="data-table-wrap">
        <table className="data-table responsive-stack">
          <thead>
            <tr>
              <th>کد</th>
              <th>مجموعه</th>
              <th>کاربر</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r._id}>
                <td data-label="کد">{r.code}</td>
                <td data-label="مجموعه">{r.pitch?.name}</td>
                <td data-label="کاربر">{r.user?.name}</td>
                <td data-label="مبلغ">{priceFa(r.amount)}</td>
                <td data-label="وضعیت">
                  <span className={`badge ${r.status}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
