'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import {
  clearPendingBooking,
  loadPendingBooking,
  savePendingBooking,
  type PendingBooking,
} from '@/lib/booking-pending';
import { addDemoPendingReservation } from '@/lib/demo-reservations';
import { demoLoginAs, isDemoFrontend } from '@/lib/demo';
import { getToken } from '@/lib/session';
import { priceFa } from '@/lib/format';
import { displaySlotTime } from '@/lib/slot-time';
import { WomenBookingNotice } from '@/components/WomenBookingNotice';
import type { WomenBookingAllowed } from '@/lib/women-booking';
import {
  GroupSplitCalculator,
  type GroupSplitCalculatorHandle,
} from '@/components/booking/GroupSplitCalculator';
import { pushTeamSplitLiveDraftToReservation } from '@/lib/team-split-api';

type PitchDetail = {
  name: string;
  address: string;
  desc?: string;
  rulesText?: string;
  womenBookingAllowed?: WomenBookingAllowed;
};

export function ReserveConfirmView() {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [pitch, setPitch] = useState<PitchDetail | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [amountPreview, setAmountPreview] = useState<number | null>(null);
  const [policyLines, setPolicyLines] = useState<string[]>([]);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  const teamSplitRef = useRef<GroupSplitCalculatorHandle>(null);
  const holdStartedRef = useRef(false);

  async function persistTeamSplitForReservation(id: string) {
    if (!pending) return;
    const pitchName = pitch?.name || pending.pitchName;
    const live = teamSplitRef.current?.getDraft();
    if (live) {
      await pushTeamSplitLiveDraftToReservation(
        id,
        { players: live.players, checklist: live.checklist, pay: live.pay },
        pitchName,
        pending.date,
        pending.slotTime,
        pending.pitchId,
      );
      return;
    }
    await teamSplitRef.current?.saveNow();
  }

  async function ensureReservationHold(booking: PendingBooking): Promise<string | null> {
    if (!getToken()) return null;

    if (booking.pitchId.startsWith('demo-') || isDemoFrontend()) {
      let id = booking.reservationId;
      if (!id || !id.startsWith('mock-')) {
        id = 'mock-' + Date.now();
      }
      const amount =
        amountPreview ?? (parseInt(search.get('amount') || '0', 10) || 0);
      addDemoPendingReservation({
        _id: id,
        date: booking.date,
        slotTime: booking.slotTime,
        amount,
        pitch: { name: booking.pitchName },
      });
      const next = { ...booking, reservationId: id };
      savePendingBooking(next);
      setPending(next);
      return id;
    }

    const storedId = booking.reservationId;
    if (storedId) {
      try {
        await apiFetch(`/reservations/${storedId}/revalidate`, {
          method: 'POST',
          body: '{}',
        });
        return storedId;
      } catch (e) {
        if (!(e instanceof ApiError) || (e.status !== 410 && e.status !== 404)) {
          throw e;
        }
      }
    }

    const data = await apiFetch<{
      success: boolean;
      message?: string;
      reservation?: { id: string; amount: number };
    }>('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        pitchId: booking.pitchId,
        slotIndex: booking.slotIndex,
        date: booking.date,
      }),
    });
    if (!data.success || !data.reservation?.id) {
      throw new Error(data.message || 'ثبت رزرو ناموفق بود');
    }
    const next = { ...booking, reservationId: data.reservation.id };
    savePendingBooking(next);
    setPending(next);
    if (data.reservation.amount > 0) {
      setAmountPreview(data.reservation.amount);
    }
    return data.reservation.id;
  }

  useEffect(() => {
    holdStartedRef.current = false;
    setReservationId(null);
    const fromStorage = loadPendingBooking();
    const merged: PendingBooking = {
      pitchId: search.get('pitchId') || fromStorage?.pitchId || '',
      pitchName: search.get('pitchName') || fromStorage?.pitchName || '',
      slotIndex: parseInt(search.get('slotIndex') || String(fromStorage?.slotIndex ?? ''), 10),
      slotTime: search.get('slotTime') || fromStorage?.slotTime || '',
      date: search.get('date') || fromStorage?.date || '',
      name: search.get('name') || fromStorage?.name || '',
      phone: search.get('phone') || fromStorage?.phone || '',
      reservationId: fromStorage?.reservationId,
    };
    if (!merged.pitchId || Number.isNaN(merged.slotIndex)) {
      setErr('اطلاعات رزرو ناقص است. از ابتدا سانس را انتخاب کنید.');
      return;
    }
    setPending(merged);
    savePendingBooking(merged);

    if (merged.pitchId.startsWith('demo-') || isDemoFrontend()) {
      setPitch({ name: merged.pitchName, address: '—' });
      setAmountPreview(parseInt(search.get('amount') || '0', 10) || null);
    } else {
      void apiFetch<{ success: boolean; pitch: PitchDetail & { commissionAmount?: number } }>(
        `/pitches/${merged.pitchId}`,
      ).then((data) => {
        if (data.success) {
          setPitch({
            name: data.pitch.name,
            address: data.pitch.address,
            desc: data.pitch.desc,
            rulesText: (data.pitch as PitchDetail).rulesText,
            womenBookingAllowed: data.pitch.womenBookingAllowed ?? null,
          });
        }
      });

      void apiFetch<{
        success: boolean;
        slots: { slotIndex: number; sitePrice?: number; price?: number; commission?: number }[];
      }>(`/pitches/${merged.pitchId}/slots?date=${encodeURIComponent(merged.date)}`).then((data) => {
        if (!data.success) return;
        const slot = data.slots.find((s) => s.slotIndex === merged.slotIndex);
        if (slot) {
          setAmountPreview(slot.sitePrice ?? slot.price ?? null);
        }
      });
    }

    void apiFetch<{ success: boolean; lines: string[] }>('/reservations/cancel-policy')
      .then((data) => {
        if (data.success && data.lines?.length) setPolicyLines(data.lines);
      })
      .catch(() => {
        setPolicyLines([
          'بیش از ۴۸ ساعت قبل از سانس: بازپرداخت کامل سهم زمین',
          'بین ۲۴ تا ۴۸ ساعت: ۵۰٪ سهم زمین',
          'کمتر از ۲۴ ساعت: بدون بازپرداخت سهم زمین',
        ]);
      });
  }, [search]);

  useEffect(() => {
    if (!pending || holdStartedRef.current) return;
    if (!getToken()) return;
    holdStartedRef.current = true;
    setHoldLoading(true);
    setErr('');
    void ensureReservationHold(pending)
      .then((id) => {
        if (id) setReservationId(id);
      })
      .catch((e) => {
        holdStartedRef.current = false;
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'ثبت موقت رزرو ناموفق بود';
        setErr(msg);
      })
      .finally(() => setHoldLoading(false));
  }, [pending]);

  async function continueToPayment() {
    if (!pending) return;
    setErr('');
    setLoading(true);

    if (!getToken()) {
      const q = new URLSearchParams({
        pitchId: pending.pitchId,
        pitchName: pending.pitchName,
        slotIndex: String(pending.slotIndex),
        slotTime: pending.slotTime,
        date: pending.date,
        name: pending.name,
        phone: pending.phone,
      });
      router.push(`/login?redirect=${encodeURIComponent(`/reserve/confirm?${q.toString()}`)}`);
      setLoading(false);
      return;
    }

    try {
      if (pending.pitchId.startsWith('demo-') || isDemoFrontend()) {
        if (!getToken()) demoLoginAs('user', pending.name, pending.phone);
      }

      let rid: string | undefined = reservationId || pending.reservationId;
      if (!rid) {
        const heldId = await ensureReservationHold(pending);
        if (heldId) rid = heldId;
      }
      if (!rid) throw new Error('رزرو ثبت نشد. دوباره سانس را انتخاب کنید.');

      await persistTeamSplitForReservation(rid);

      const amount =
        amountPreview ??
        parseInt(search.get('amount') || '0', 10) ??
        0;

      clearPendingBooking();
      const payQ = new URLSearchParams({
        reservationId: rid,
        pitchId: pending.pitchId,
        pitchName: pending.pitchName,
        date: pending.date,
        time: pending.slotTime,
        name: pending.name,
        phone: pending.phone,
        amount: String(amount),
      });
      router.push(`/payment?${payQ.toString()}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'خطا در ثبت رزرو';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!pending && !err) {
    return (
      <div className="page page-narrow">
        <p className="subtitle">در حال بارگذاری…</p>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <header className="page-hero">
        <p className="eyebrow">بررسی نهایی</p>
        <h1>تأیید جزئیات رزرو</h1>
        <p className="subtitle">
          با انتخاب سانس، تا ۱۰ دقیقه «در حال رزرو» نگه داشته می‌شود؛ پس از تأیید، رزرو ثبت می‌شود.
        </p>
      </header>

      <div className="panel">
        <table className="data-table responsive-stack">
          <tbody>
            <tr>
              <th>مجموعه</th>
              <td>{pitch?.name || pending?.pitchName}</td>
            </tr>
            <tr>
              <th>آدرس</th>
              <td>{pitch?.address || '—'}</td>
            </tr>
            <tr>
              <th>تاریخ</th>
              <td>{pending?.date}</td>
            </tr>
            <tr>
              <th>سانس</th>
              <td>{pending?.slotTime ? displaySlotTime(pending.slotTime) : '—'}</td>
            </tr>
            <tr>
              <th>مبلغ (تومان)</th>
              <td>{amountPreview != null ? priceFa(amountPreview) : '—'}</td>
            </tr>
          </tbody>
        </table>
        {amountPreview != null && amountPreview > 0 && pending ? (
          <>
            <GroupSplitCalculator
              ref={teamSplitRef}
              totalAmount={amountPreview}
              pitchName={pitch?.name || pending.pitchName}
              pitchId={pending.pitchId}
              date={pending.date}
              time={pending.slotTime}
              bookerName={pending.name}
              reservationId={reservationId || pending.reservationId}
              reservationAwaitingPayment
            />
            {holdLoading ? (
              <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
                در حال ثبت موقت رزرو (قفل سانس)…
              </p>
            ) : null}
            <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
              لیست را بسازید، برای هر نفر «زده» بزنید، سپس{' '}
              <strong>ثبت چک‌لیست</strong> — بعد در پنل بازیکن دیده می‌شود.{' '}
              <strong>پرداخت سانس</strong> با «ادامه و پرداخت» انجام می‌شود.
            </p>
          </>
        ) : null}
        {pitch ? (
          <WomenBookingNotice allowed={pitch.womenBookingAllowed} />
        ) : null}
        <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
          کد تخفیف (مثلاً از بازی پنالتی) در مرحله پرداخت قابل اعمال است.
        </p>
        <ul className="notice" style={{ marginTop: '1rem', paddingRight: '1.1rem' }}>
          {policyLines.length
            ? policyLines.map((line) => <li key={line}>{line}</li>)
            : 'قوانین کنسلی پس از اتصال به سرور نمایش داده می‌شود.'}
        </ul>
        {pitch?.rulesText ? (
          <div style={{ marginTop: '0.75rem' }}>
            <h3 className="h6">قوانین این مجموعه</h3>
            <p className="muted-sm" style={{ whiteSpace: 'pre-wrap' }}>
              {pitch.rulesText}
            </p>
          </div>
        ) : null}
        {pitch?.desc && (
          <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
            {pitch.desc}
          </p>
        )}
        {err && <p className="form-msg err">{err}</p>}
        <div className="hero-actions" style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              loading || holdLoading || !pending || (!!getToken() && !reservationId)
            }
            onClick={continueToPayment}
          >
            ادامه و پرداخت
          </button>
          <Link href="/reserve" className="btn btn-secondary">
            بازگشت
          </Link>
        </div>
      </div>
    </div>
  );
}
