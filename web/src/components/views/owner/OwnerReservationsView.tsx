'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  ListToolbar,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import { getDemoOwnerReservations } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';
import { displayStatusFa, statusBadgeClass } from '@/lib/reservation-status';

type Reservation = {
  _id: string;
  code: string;
  status: string;
  bookingStatus?: string;
  date: string;
  slotTime: string;
  amount: number;
  user?: { name: string; phone: string };
};

export function OwnerReservationsView() {
  const { pitches, pitchId, setPitchId } = useOwnerPitches();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [codeLookup, setCodeLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<Reservation | null>(null);
  const [msg, setMsg] = useState('');

  function load() {
    if (!pitchId) return;
    if (isDemoFrontend()) {
      setRows(
        getDemoOwnerReservations().map((r) => ({
          ...r,
          user: { name: r.playerName, phone: '09120000000' },
        })) as Reservation[],
      );
      return;
    }
    void apiFetch<{ success: boolean; reservations: Reservation[] }>(
      `/owner/pitches/${pitchId}/reservations`,
    )
      .then((d) => {
        if (d.success) setRows(d.reservations);
      })
      .catch(() => {
        setRows(
          getDemoOwnerReservations().map((r) => ({
            ...r,
            user: { name: r.playerName, phone: '09120000000' },
          })) as Reservation[],
        );
      });
  }

  useEffect(() => {
    load();
  }, [pitchId]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${r.code} ${r.user?.name} ${r.user?.phone} ${r.date}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [rows, search, statusFilter]);

  async function checkIn(id: string) {
    setMsg('');
    if (isDemoFrontend()) {
      setMsg('در حالت نمایشی check-in شبیه‌سازی شد');
      return;
    }
    try {
      await apiFetch(`/owner/reservations/${id}/check-in`, {
        method: 'PATCH',
        body: '{}',
      });
      setMsg('ورود مشتری ثبت شد');
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'خطا');
    }
  }

  async function lookupByCode() {
    setMsg('');
    setLookupResult(null);
    const code = codeLookup.trim();
    if (!code) return;
    try {
      const data = await apiFetch<{ success: boolean; reservation: Reservation }>(
        `/owner/reservations/by-code/${encodeURIComponent(code)}`,
      );
      if (data.success) setLookupResult(data.reservation);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'رزرو پیدا نشد');
    }
  }

  async function cancelWithReason(id: string) {
    const reason = prompt('دلیل لغو (الزامی):');
    if (!reason?.trim()) {
      setMsg('ثبت دلیل لغو الزامی است');
      return;
    }
    if (isDemoFrontend()) {
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'cancelled' } : r)),
      );
      return;
    }
    try {
      await apiFetch(`/owner/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled', reason: reason.trim() }),
      });
      load();
      setMsg('رزرو لغو شد');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'خطا');
    }
  }

  return (
    <>
      <PageIntro
        title="رزروها"
        description="جستجو با کد، ثبت ورود (QR/کد) و مدیریت رزرو."
      />
      <ActionsPanel title="جستجوی کد / QR">
        <div className="hero-actions">
          <input
            placeholder="مثلاً SNS-ABC123"
            value={codeLookup}
            onChange={(e) => setCodeLookup(e.target.value.toUpperCase())}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={lookupByCode}>
            بررسی
          </button>
        </div>
        {lookupResult && (
          <div className="panel" style={{ marginTop: '0.75rem' }}>
            <p>
              <strong>{lookupResult.code}</strong> · {lookupResult.date} · {lookupResult.slotTime}
            </p>
            <p className="muted-sm">
              {displayStatusFa(lookupResult.status, lookupResult.bookingStatus)}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => checkIn(lookupResult._id)}
            >
              ثبت ورود
            </button>
          </div>
        )}
      </ActionsPanel>
      {msg && <p className="notice">{msg}</p>}
      {pitches.length > 0 && (
        <ActionsPanel title="فیلتر مجموعه">
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
        </ActionsPanel>
      )}
      <DataSection
        title="لیست رزرو"
        toolbar={
          <ListToolbar
            searchPlaceholder="جستجو: کد، نام، تاریخ…"
            searchValue={search}
            onSearchChange={setSearch}
            filters={
              <select
                className="dash-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="وضعیت"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار پرداخت</option>
                <option value="paid">پرداخت‌شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            }
          />
        }
      >
        <div className="data-table-wrap">
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted-sm">
                    رزروی یافت نشد.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>{r.code}</td>
                  <td>
                    {r.user?.name}
                    <br />
                    <span className="muted-sm">{r.user?.phone}</span>
                  </td>
                  <td>{r.date}</td>
                  <td>{r.slotTime}</td>
                  <td>{priceFa(r.amount)}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(r.bookingStatus || r.status)}`}>
                      {displayStatusFa(r.status, r.bookingStatus)}
                    </span>
                  </td>
                  <td className="table-actions">
                    {(r.bookingStatus === 'confirmed' || r.status === 'paid') && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => checkIn(r._id)}
                      >
                        ورود
                      </button>
                    )}
                    {r.status !== 'cancelled' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => cancelWithReason(r._id)}
                      >
                        لغو
                      </button>
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
