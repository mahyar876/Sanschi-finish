'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchReservationVerify, type ReservationVerifyPayload } from '@/lib/reservation-verify-api';
import { getDemoMyReservations } from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { displaySlotTime } from '@/lib/slot-time';
import { displayStatusFa } from '@/lib/reservation-status';
import { ReservationQr } from '@/components/ReservationQr';

export function VerifyReservationView() {
  const params = useParams();
  const rawCode = typeof params.code === 'string' ? decodeURIComponent(params.code) : '';
  const [data, setData] = useState<ReservationVerifyPayload | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = rawCode.trim();
    if (!code) {
      setErr('کد رزرو نامعتبر است');
      setLoading(false);
      return;
    }

    void fetchReservationVerify(code).then((v) => {
      if (v) {
        setData(v);
        setLoading(false);
        return;
      }
      if (isDemoFrontend()) {
        const demo = getDemoMyReservations().find(
          (r) => r.code.toUpperCase() === code.toUpperCase() && r.status === 'paid',
        );
        if (demo) {
          setData({
            code: demo.code,
            pitchName: demo.pitch?.name || 'مجموعه',
            pitchAddress: '—',
            date: demo.date,
            slotTime: demo.slotTime,
            amount: demo.amount,
            bookerName: 'کاربر نمایشی',
            bookerPhoneMasked: '0912***0000',
            status: 'paid',
            bookingStatus: 'confirmed',
            paymentStatus: 'successful',
            valid: true,
            checkedIn: false,
          });
          setLoading(false);
          return;
        }
      }
      setErr('رزرو با این کد پیدا نشد یا دیگر معتبر نیست.');
      setLoading(false);
    });
  }, [rawCode]);

  if (loading) {
    return (
      <div className="page page-narrow">
        <p className="subtitle">در حال بارگذاری…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="page page-narrow">
        <header className="page-hero">
          <p className="eyebrow">تأیید رزرو</p>
          <h1>کد نامعتبر</h1>
          <p className="subtitle">{err || 'رزرو پیدا نشد'}</p>
        </header>
        <Link href="/" className="btn btn-secondary">
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  const statusLabel = displayStatusFa(data.status, data.bookingStatus);
  const timeLabel = displaySlotTime(data.slotTime);

  return (
    <div className="page page-narrow">
      <header className="page-hero">
        <p className="eyebrow">تأیید سانس — سانس‌چی</p>
        <h1>{data.valid ? 'رزرو معتبر' : 'رزرو غیرفعال'}</h1>
        <p className="subtitle">
          {data.valid
            ? 'برای صاحب زمین: با این اطلاعات حضور رزروکننده را در سانس چک کنید.'
            : 'این رزرو لغو، منقضی یا هنوز پرداخت نشده است.'}
        </p>
      </header>

      <div className={`panel verify-res-card${data.valid ? ' verify-res-card--ok' : ' verify-res-card--bad'}`}>
        <div className="verify-res-badge" role="status">
          {data.valid ? '✓ قابل قبول برای ورود' : '✕ قابل قبول نیست'}
        </div>

        <table className="data-table responsive-stack verify-res-table">
          <tbody>
            <tr>
              <th>کد رزرو</th>
              <td>
                <strong>{data.code}</strong>
              </td>
            </tr>
            <tr>
              <th>مجموعه / زمین</th>
              <td>{data.pitchName}</td>
            </tr>
            {data.pitchAddress ? (
              <tr>
                <th>آدرس</th>
                <td>{data.pitchAddress}</td>
              </tr>
            ) : null}
            <tr>
              <th>تاریخ</th>
              <td>{data.date}</td>
            </tr>
            <tr>
              <th>سانس</th>
              <td>{timeLabel}</td>
            </tr>
            <tr>
              <th>رزروکننده</th>
              <td>{data.bookerName || '—'}</td>
            </tr>
            {data.bookerPhoneMasked ? (
              <tr>
                <th>موبایل (نمایشی)</th>
                <td dir="ltr">{data.bookerPhoneMasked}</td>
              </tr>
            ) : null}
            <tr>
              <th>مبلغ سانس</th>
              <td>{priceFa(data.amount)} تومان</td>
            </tr>
            <tr>
              <th>وضعیت</th>
              <td>{statusLabel}</td>
            </tr>
            {data.checkedIn ? (
              <tr>
                <th>ورود</th>
                <td>ثبت‌شده در سیستم</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="verify-res-qr">
          <ReservationQr code={data.code} size={140} showCaption={false} />
          <p className="muted-sm">همین QR روی گوشی بازیکن — همان اطلاعات</p>
        </div>
      </div>

      <div className="hero-actions" style={{ marginTop: '1.25rem' }}>
        <Link href="/owner/reservations" className="btn btn-primary">
          پنل صاحب زمین
        </Link>
        <Link href="/" className="btn btn-secondary">
          خانه
        </Link>
      </div>
    </div>
  );
}
