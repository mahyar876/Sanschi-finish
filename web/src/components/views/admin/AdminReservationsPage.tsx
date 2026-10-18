'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  ListToolbar,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { getDemoAdminReservations } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { apiFetch } from '@/lib/fetch-api';
import { priceFa } from '@/lib/format';

type Row = {
  _id: string;
  code: string;
  status: string;
  amount: number;
  user?: { name: string };
  pitch?: { name: string };
};

export function AdminReservationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isDemoFrontend()) {
      setRows(getDemoAdminReservations());
      return;
    }
    void apiFetch<{ success: boolean; reservations: Row[] }>('/reservations')
      .then((d) => d.success && setRows(d.reservations))
      .catch(() => setRows(getDemoAdminReservations()));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim();
      return r.code.includes(q) || r.user?.name?.includes(q) || r.pitch?.name?.includes(q);
    });
  }, [rows, statusFilter, query]);

  const stats = useMemo(() => {
    return {
      pending: rows.filter((r) => r.status === 'pending').length,
      paid: rows.filter((r) => r.status === 'paid').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
    };
  }, [rows]);

  async function setStatus(id: string, status: 'paid' | 'cancelled') {
    if (!isDemoFrontend()) {
      await apiFetch(`/owner/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    }
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
  }

  return (
    <>
      <PageIntro title="رزروها" description="مدیریت وضعیت پرداخت و لغو رزرو." />
      <StatGrid>
        <StatCard label="در انتظار" value={stats.pending} />
        <StatCard label="پرداخت‌شده" value={stats.paid} />
        <StatCard label="لغو" value={stats.cancelled} />
      </StatGrid>
      <ActionsPanel title="فیلتر">
        <ListToolbar searchValue={query} onSearchChange={setQuery} searchPlaceholder="کد، کاربر، مجموعه…" />
        <div className="field" style={{ maxWidth: 220, marginTop: '0.75rem' }}>
          <label>وضعیت</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">همه</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
      </ActionsPanel>
      <DataSection title="لیست رزرو">
        <div className="data-table-wrap">
          <table className="data-table responsive-stack">
            <thead>
              <tr>
                <th>کد</th>
                <th>مجموعه</th>
                <th>کاربر</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td data-label="کد">{r.code}</td>
                  <td data-label="مجموعه">{r.pitch?.name}</td>
                  <td data-label="کاربر">{r.user?.name}</td>
                  <td data-label="مبلغ">{priceFa(r.amount)}</td>
                  <td data-label="وضعیت">
                    <span className={`badge ${r.status}`}>{r.status}</span>
                  </td>
                  <td className="table-actions" data-label="">
                    {r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void setStatus(r._id, 'paid')}
                        >
                          تأیید
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void setStatus(r._id, 'cancelled')}
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
      </DataSection>
    </>
  );
}
