'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import {
  cancelDemoReservation,
  getDemoMyReservations,
} from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { displayStatusFa, statusBadgeClass } from '@/lib/reservation-status';
import { displaySlotTime } from '@/lib/slot-time';
import { GroupSplitCalculator } from '@/components/booking/GroupSplitCalculator';
import { ReservationQr } from '@/components/ReservationQr';
import { getUser } from '@/lib/session';

type Reservation = {
  _id: string;
  code: string;
  status: string;
  bookingStatus?: string;
  paymentStatus?: string;
  date: string;
  slotTime: string;
  amount: number;
  pitch?: { name: string; _id?: string };
};

function isAwaitingPlatformPayment(r: Reservation) {
  return (
    r.status === 'pending' ||
    r.bookingStatus === 'pending_payment' ||
    r.paymentStatus === 'pending'
  );
}

type Tab = 'upcoming' | 'completed' | 'cancelled';

function isCancelledReservation(r: Reservation) {
  return (
    r.status === 'cancelled' ||
    r.bookingStatus?.startsWith('cancelled') ||
    r.bookingStatus === 'expired'
  );
}

export function PlayerReservationsView() {
  const pathname = usePathname();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<Tab>('upcoming');
  const bookerName = getUser()?.name;

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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
    if (isDemoFrontend()) {
      if (!confirm('این رزرو لغو شود؟')) return;
      cancelDemoReservation(id);
      void load();
      return;
    }
    try {
      const preview = await apiFetch<{
        success: boolean;
        allowed?: boolean;
        reason?: string;
        refundAmount?: number;
        refundToWallet?: boolean;
        refundViaGateway?: boolean;
      }>(`/reservations/${id}/cancel-preview`);
      const refund = preview.refundAmount || 0;
      let msg = preview.reason || 'این رزرو لغو شود؟';
      if (refund > 0) {
        msg += `\nبازپرداخت تقریبی: ${priceFa(refund)} تومان`;
        if (preview.refundToWallet) msg += ' (به کیف پول)';
        else if (preview.refundViaGateway) msg += ' (پیگیری درگاه)';
      } else if (preview.allowed === false) {
        msg += '\nبازپرداختی برای سهم زمین ندارید.';
      }
      if (!confirm(msg)) return;

      const data = await apiFetch<{
        success: boolean;
        message?: string;
        refundedToWallet?: boolean;
        refundAmount?: number;
      }>(`/reservations/${id}/cancel`, { method: 'POST', body: '{}' });
      if (data.message) alert(data.message);
    } catch {
      try {
        const data = await apiFetch<{ message?: string }>(`/reservations/${id}`, {
          method: 'DELETE',
        });
        if (data.message) alert(data.message);
      } catch {
        alert('لغو انجام نشد');
      }
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
                    {r.date} · {displaySlotTime(r.slotTime)}
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
              {(r.status === 'paid' ||
                r.bookingStatus === 'confirmed' ||
                r.bookingStatus === 'checked_in') &&
              r.code &&
              r.code !== '—' ? (
                <ReservationQr code={r.code} size={120} />
              ) : null}
              {isAwaitingPlatformPayment(r) ? (
                <p className="notice res-pay-reminder" style={{ marginTop: '0.75rem' }}>
                  سانس هنوز در سانس‌چی <strong>پرداخت نشده</strong>. تیک «زده» در چک‌لیست فقط
                  یعنی آن نفر سهمش را به شما داده — برای قطعی شدن رزرو دکمه{' '}
                  <strong>پرداخت</strong> را بزنید.
                </p>
              ) : null}
              {!isCancelledReservation(r) && r.amount > 0 ? (
                <details className="res-team-split-acc" open={isAwaitingPlatformPayment(r)}>
                  <summary>تیم و سهم — کی زده؟ (باز کنید)</summary>
                  <GroupSplitCalculator
                    reservationId={r._id}
                    reservationCode={r.code && r.code !== '—' ? r.code : undefined}
                    totalAmount={r.amount}
                    pitchName={r.pitch?.name || 'مجموعه'}
                    pitchId={r.pitch?._id}
                    date={r.date}
                    time={r.slotTime}
                    bookerName={bookerName}
                    reservationAwaitingPayment={isAwaitingPlatformPayment(r)}
                  />
                </details>
              ) : null}
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
