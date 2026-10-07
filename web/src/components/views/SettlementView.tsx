'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/fetch-api';
import { getUser } from '@/lib/session';
import { priceFa } from '@/lib/format';

const ownerNav = [
  { href: '/owner', label: 'رزروها' },
  { href: '/finance', label: 'گزارش مالی' },
  { href: '/settlement', label: 'تسویه' },
];

const adminNav = [
  { href: '/admin', label: 'مدیریت' },
  { href: '/admin/finance', label: 'مالی کل' },
  { href: '/settlement', label: 'تسویه‌ها' },
];

type Settlement = {
  _id: string;
  date: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  pitch?: { name: string };
};

export function SettlementView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Settlement[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    const path = isAdmin ? '/settlements' : '/settlements/my';
    void apiFetch<{ success: boolean; settlements: Settlement[] }>(path).then((d) => {
      if (d.success) setRows(d.settlements);
    });
  }

  useEffect(() => {
    setIsAdmin(getUser()?.role === 'admin');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function requestSettlement() {
    setMsg('');
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>(
        '/settlements/request',
        { method: 'POST', body: JSON.stringify({ fromDate: from, toDate: to }) },
      );
      if (!data.success) throw new Error(data.message);
      setMsg(data.message || 'ثبت شد');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    }
  }

  return (
    <DashboardShell
      title="تسویه مالی"
      subtitle="درخواست و پیگیری تسویه با سانس‌چی"
      nav={isAdmin ? adminNav : ownerNav}
      requireRole={isAdmin ? 'admin' : 'any'}
    >
      {!isAdmin && (
        <div className="panel" style={{ marginBottom: '1.25rem' }}>
          <h2>درخواست تسویه بازه‌ای</h2>
          <div className="field">
            <label>از تاریخ (۱۴۰۴/01/01)</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>تا تاریخ</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={requestSettlement}>
            ثبت درخواست
          </button>
          {msg && <p className="form-msg ok">{msg}</p>}
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>تاریخ</th>
              <th>مجموعه</th>
              <th>ناخالص</th>
              <th>کارمزد</th>
              <th>خالص</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
                  تسویه‌ای ثبت نشده
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s._id}>
                <td>{s.date}</td>
                <td>{s.pitch?.name || '—'}</td>
                <td>{priceFa(s.grossAmount)}</td>
                <td>{priceFa(s.commissionAmount)}</td>
                <td>{priceFa(s.netAmount)}</td>
                <td>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
