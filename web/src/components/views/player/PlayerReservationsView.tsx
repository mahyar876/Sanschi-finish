'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import {
  cancelDemoReservation,
  getDemoMyReservations,
} from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { displayStatusFa, statusBadgeClass } from '@/lib/reservation-status';

type Reservation = {
  _id: string;
  code: string;
  status: string;
  bookingStatus?: string;
  date: string;
  slotTime: string;
  amount: number;
  pitch?: { name: string; _id?: string };
};

type Tab = 'upcoming' | 'completed' | 'cancelled';

export function PlayerReservationsView() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<Tab>('upcoming');

  async function load() {
    if (isDemoFrontend()) {
      setRows(getDemoMyReservations());
      return;
    }
    try {
      const data = await apiFetch<{ success: boolean; reservations: Reservation[] }>(
        '/reservations/my',
      );
      if (data.success) setRows(data.reservations);
    } catch {
      setRows(getDemoMyReservations());
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const cancelled = (r: Reservation) =>
      r.status === 'cancelled' ||
      r.bookingStatus?.startsWith('cancelled') ||
      r.bookingStatus === 'expired';
    const completed = (r: Reservation) =>
      r.status === 'paid' ||
      r.bookingStatus === 'confirmed' ||
      r.bookingStatus === 'checked_in' ||
      r.bookingStatus === 'completed' ||
      r.bookingStatus === 'no_show';
    const upcoming = (r: Reservation) =>
      r.status === 'pending' || r.bookingStatus === 'pending_payment';
    if (tab === 'cancelled') return rows.filter(cancelled);
    if (tab === 'completed') return rows.filter(completed);
    return rows.filter(upcoming);
  }, [rows, tab]);

  async function cancelReservation(id: string) {
    if (!confirm('این رزرو لغو شود؟')) return;
    if (isDemoFrontend()) {
      cancelDemoReservation(id);
      void load();
      return;
    }
    try {
      await apiFetch(`/reservations/${id}/cancel`, { method: 'POST', body: '{}' });
    } catch {
      await apiFetch(`/reservations/${id}`, { method: 'DELETE' });
    }
    void load();
  }

  async function submitReview(id: string) {
    const rating = prompt('امتیاز ۱ تا ۵');
    if (!rating) return;
    const text = prompt('متن نظر (اختیاری)') || '';
    await apiFetch(`/reservations/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, text }),
    });
    alert('نظر ثبت شد');
  }

  return (
    <>
      <PageIntro title="رزروهای من" description="آینده، انجام‌شده و لغوشده — با جزئیات و کد رزرو." />
      <div className="dash-tabs" role="tablist">
        {(
          [
            ['upcoming', 'آینده'],
            ['completed', 'انجام‌شده'],
            ['cancelled', 'لغوشده'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'dash-tab active' : 'dash-tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <DataSection title="لیست">
        <div className="res-card-list">
          {filtered.length === 0 && (
            <p className="notice">
              موردی نیست —{' '}
              <Link href="/player/search">زمین پیدا کنید</Link>
            </p>
          )}
          {filtered.map((r) => (
            <article key={r._id} className="res-card panel">
              <div className="res-card-top">
                <div>
                  <h3 className="dash-section-title">{r.pitch?.name || 'مجموعه'}</h3>
                  <p className="muted-sm">
                    {r.date} · {r.slotTime}
                  </p>
                </div>
                <span className={`badge ${statusBadgeClass(r.bookingStatus || r.status)}`}>
                  {displayStatusFa(r.status, r.bookingStatus)}
                </span>
              </div>
              <div className="res-card-meta">
                <span>کد: {r.code}</span>
                <span>{priceFa(r.amount)}</span>
              </div>
              {(r.status === 'paid' || r.bookingStatus === 'confirmed') && (
                <img
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(r.code)}&size=120`}
                  alt=""
                  width={120}
                  height={120}
                  className="res-qr-placeholder"
                />
              )}
              <div className="pitch-admin-actions">
                {(r.status === 'pending' || r.bookingStatus === 'pending_payment') && (
                  <>
                    <Link
                      href={`/payment?reservationId=${r._id}&amount=${r.amount}&pitchName=${encodeURIComponent(r.pitch?.name || '')}&date=${r.date}&time=${encodeURIComponent(r.slotTime)}`}
                      className="btn btn-primary btn-sm"
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
                {(r.bookingStatus === 'confirmed' ||
                  r.bookingStatus === 'checked_in') && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => cancelReservation(r._id)}
                  >
                    لغو (طبق قانون)
                  </button>
                )}
                {r.bookingStatus === 'completed' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => submitReview(r._id)}
                  >
                    ثبت نظر
                  </button>
                )}
                <Link
                  href={`/reserve?venue=&pitchId=${r.pitch?._id || ''}`}
                  className="btn btn-secondary btn-sm"
                >
                  رزرو مجدد
                </Link>
              </div>
            </article>
          ))}
        </div>
      </DataSection>
    </>
  );
}
