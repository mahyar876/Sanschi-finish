'use client';

import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoSettlements } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { getUser } from '@/lib/session';
import { priceFa } from '@/lib/format';

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
    if (isDemoFrontend()) {
      setRows(getDemoSettlements());
      return;
    }
    const path = isAdmin ? '/settlements' : '/settlements/my';
    void apiFetch<{ success: boolean; settlements: Settlement[] }>(path)
      .then((d) => {
        if (d.success) setRows(d.settlements);
      })
      .catch(() => setRows(getDemoSettlements()));
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
      if (isDemoFrontend()) {
        setMsg('درخواست تسویه (نمایشی) ثبت شد');
        setRows(getDemoSettlements());
        return;
      }
      setMsg(e instanceof Error ? e.message : 'خطا');
    }
  }

  return (
    <>
      <PageIntro title="تسویه مالی" description="درخواست و پیگیری تسویه با سانس‌چی" />
      {!isAdmin && (
        <ActionsPanel title="درخواست تسویه بازه‌ای">
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
        </ActionsPanel>
      )}

      <DataSection title="لیست تسویه">
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
      </DataSection>
    </>
  );
}
