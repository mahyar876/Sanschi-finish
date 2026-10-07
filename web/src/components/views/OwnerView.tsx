'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/fetch-api';
import { priceFa } from '@/lib/format';

const ownerNav = [
  { href: '/owner', label: 'رزروها' },
  { href: '/finance', label: 'گزارش مالی' },
  { href: '/settlement', label: 'تسویه' },
];

type Reservation = {
  _id: string;
  code: string;
  status: string;
  date: string;
  slotTime: string;
  amount: number;
  user?: { name: string; phone: string };
};

export function OwnerView() {
  const [pitchId, setPitchId] = useState('');
  const [pitches, setPitches] = useState<{ _id: string; name: string }[]>([]);
  const [rows, setRows] = useState<Reservation[]>([]);

  useEffect(() => {
    void apiFetch<{ success: boolean; pitches: { _id: string; name: string }[] }>(
      '/owner/pitches',
    ).then((d) => {
      if (d.success && d.pitches.length) {
        setPitches(d.pitches);
        setPitchId(d.pitches[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    if (!pitchId) return;
    void apiFetch<{ success: boolean; reservations: Reservation[] }>(
      `/owner/pitches/${pitchId}/reservations`,
    ).then((d) => {
      if (d.success) setRows(d.reservations);
    });
  }, [pitchId]);

  async function setStatus(id: string, status: 'paid' | 'cancelled') {
    await apiFetch(`/owner/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
  }

  return (
    <DashboardShell
      title="پنل مالک مجموعه"
      subtitle="مشاهده رزروها و وضعیت پرداخت"
      nav={ownerNav}
    >
      {pitches.length > 0 && (
        <div className="field" style={{ maxWidth: 320 }}>
          <label>مجموعه</label>
          <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
            {pitches.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {pitches.length === 0 && (
        <p className="notice">هنوز مجموعه‌ای به حساب شما متصل نشده است.</p>
      )}
      <div className="data-table-wrap" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>کد</th>
              <th>مشتری</th>
              <th>تاریخ</th>
              <th>سانس</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.code}</td>
                <td>
                  {r.user?.name}
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {r.user?.phone}
                  </span>
                </td>
                <td>{r.date}</td>
                <td>{r.slotTime}</td>
                <td>{priceFa(r.amount)}</td>
                <td>
                  <span className={`badge ${r.status}`}>{r.status}</span>
                </td>
                <td>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setStatus(r._id, 'paid')}
                    >
                      تأیید پرداخت
                    </button>
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
