'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

type PitchDetail = {
  name: string;
  address: string;
  desc?: string;
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

  useEffect(() => {
    const fromStorage = loadPendingBooking();
    const merged: PendingBooking = {
      pitchId: search.get('pitchId') || fromStorage?.pitchId || '',
      pitchName: search.get('pitchName') || fromStorage?.pitchName || '',
      slotIndex: parseInt(search.get('slotIndex') || String(fromStorage?.slotIndex ?? ''), 10),
      slotTime: search.get('slotTime') || fromStorage?.slotTime || '',
      date: search.get('date') || fromStorage?.date || '',
      name: search.get('name') || fromStorage?.name || '',
      phone: search.get('phone') || fromStorage?.phone || '',
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
      setPolicyLines([
        'لغو بیش از ۲۴ ساعت قبل از سانس: استرداد کامل (نمایشی).',
        'لغو کمتر از ۲۴ ساعت: جریمه ۵۰٪ (نمایشی).',
        'عدم حضور: بدون استرداد (نمایشی).',
      ]);
      return;
    }

    void apiFetch<{ success: boolean; pitch: PitchDetail & { commissionAmount?: number } }>(
      `/pitches/${merged.pitchId}`,
    ).then((data) => {
      if (data.success) setPitch({ name: data.pitch.name, address: data.pitch.address, desc: data.pitch.desc });
    });

    void apiFetch<{ success: boolean; slots: { slotIndex: number; sitePrice?: number; price?: number; commission?: number }[] }>(
      `/pitches/${merged.pitchId}/slots?date=${encodeURIComponent(merged.date)}`,
    ).then((data) => {
      if (!data.success) return;
      const slot = data.slots.find((s) => s.slotIndex === merged.slotIndex);
      if (slot) {
        setAmountPreview(slot.sitePrice ?? slot.price ?? null);
      }
    });

    void apiFetch<{ success: boolean; lines: string[] }>('/reservations/cancel-policy').then(
      (data) => {
        if (data.success) setPolicyLines(data.lines);
      },
    );
  }, [search]);

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
        const mockId = 'mock-' + Date.now();
        const amount = amountPreview ?? 0;
        addDemoPendingReservation({
          _id: mockId,
          date: pending.date,
          slotTime: pending.slotTime,
          amount,
          pitch: { name: pending.pitchName },
        });
        clearPendingBooking();
        const payQ = new URLSearchParams({
          reservationId: mockId,
          pitchId: pending.pitchId,
          pitchName: pending.pitchName,
          date: pending.date,
          time: pending.slotTime,
          name: pending.name,
          phone: pending.phone,
          amount: String(amount),
        });
        router.push(`/payment?${payQ.toString()}`);
        return;
      }

      const data = await apiFetch<{
        success: boolean;
        message?: string;
        reservation?: {
          id: string;
          amount: number;
          basePrice?: number;
          discountAmount?: number;
          commissionAmount?: number;
          address?: string;
          lockExpiresAt?: string;
        };
      }>('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          pitchId: pending.pitchId,
          slotIndex: pending.slotIndex,
          date: pending.date,
        }),
      });

      if (!data.success || !data.reservation) throw new Error(data.message);

      clearPendingBooking();
      const payQ = new URLSearchParams({
        reservationId: data.reservation.id,
        pitchId: pending.pitchId,
        pitchName: pending.pitchName,
        date: pending.date,
        time: pending.slotTime,
        name: pending.name,
        phone: pending.phone,
        amount: String(data.reservation.amount),
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
        <p className="subtitle">پس از تأیید، سانس به مدت ۱۰ دقیقه برای شما قفل می‌شود.</p>
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
              <td>{pending?.slotTime}</td>
            </tr>
            <tr>
              <th>مبلغ (تومان)</th>
              <td>{amountPreview != null ? priceFa(amountPreview) : '—'}</td>
            </tr>
          </tbody>
        </table>
        <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
          کد تخفیف (مثلاً از بازی پنالتی) در مرحله پرداخت قابل اعمال است.
        </p>
        <ul className="notice" style={{ marginTop: '1rem', paddingRight: '1.1rem' }}>
          {policyLines.length
            ? policyLines.map((line) => <li key={line}>{line}</li>)
            : 'قوانین کنسلی پس از اتصال به سرور نمایش داده می‌شود.'}
        </ul>
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
            disabled={loading || !pending}
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
