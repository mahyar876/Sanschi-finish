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

type Res = {
  _id: string;
  amount: number;
  status: string;
  siteCommission?: number | null;
  pitchAmount?: number | null;
};

export function FinanceView() {
  const [pitchId, setPitchId] = useState('');
  const [pitches, setPitches] = useState<{ _id: string; name: string; commissionAmount?: number }[]>([]);
  const [rows, setRows] = useState<Res[]>([]);

  useEffect(() => {
    void apiFetch<{ success: boolean; pitches: typeof pitches }>('/owner/pitches').then((d) => {
      if (d.success && d.pitches.length) {
        setPitches(d.pitches);
        setPitchId(d.pitches[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    if (!pitchId) return;
    void apiFetch<{ success: boolean; reservations: Res[] }>(
      `/owner/pitches/${pitchId}/reservations`,
    ).then((d) => {
      if (d.success) setRows(d.reservations.filter((r) => r.status === 'paid'));
    });
  }, [pitchId]);

  const pitch = pitches.find((p) => p._id === pitchId);
  const commissionDefault = pitch?.commissionAmount ?? 0;

  let gross = 0;
  let commission = 0;
  let net = 0;
  for (const r of rows) {
    gross += r.amount || 0;
    const c = r.siteCommission ?? commissionDefault;
    const n = r.pitchAmount ?? Math.max(0, (r.amount || 0) - c);
    commission += c;
    net += n;
  }

  return (
    <DashboardShell
      title="گزارش مالی"
      subtitle="درآمد، کارمزد پلتفرم (فعلاً معمولاً ۰) و سهم شما"
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

      <div className="stat-row" style={{ marginTop: '1.25rem' }}>
        <div className="stat-card">
          <div className="label">دریافتی مشتری (ناخالص)</div>
          <div className="value">{priceFa(gross)}</div>
        </div>
        <div className="stat-card">
          <div className="label">کارمزد سانس‌چی</div>
          <div className="value">{priceFa(commission)}</div>
          <div className="hint">فعلاً در عمل ۰ — آماده برای فاز بعد</div>
        </div>
        <div className="stat-card">
          <div className="label">سهم شما (خالص)</div>
          <div className="value">{priceFa(net)}</div>
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>مبلغ کل</th>
              <th>کارمزد</th>
              <th>سهم مالک</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = r.siteCommission ?? commissionDefault;
              const n = r.pitchAmount ?? Math.max(0, (r.amount || 0) - c);
              return (
                <tr key={r._id}>
                  <td>{priceFa(r.amount)}</td>
                  <td>{priceFa(c)}</td>
                  <td>{priceFa(n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
