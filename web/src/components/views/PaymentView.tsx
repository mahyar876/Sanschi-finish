'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetch-api';
import { getToken } from '@/lib/session';
import { priceFa } from '@/lib/format';

export function PaymentView() {
  const search = useSearchParams();
  const reservationId = search.get('reservationId') || '';
  const amount = parseInt(search.get('amount') || '0', 10);
  const pitchName = search.get('pitchName') || '—';
  const date = search.get('date') || '—';
  const time = search.get('time') || '—';
  const name = search.get('name') || '—';
  const payResult = search.get('payResult');

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(payResult === 'success');
  const [err, setErr] = useState(payResult === 'failed' ? 'پرداخت ناموفق یا لغو شد' : '');
  const [code, setCode] = useState(search.get('code') || '');

  async function payDemo() {
    setLoading(true);
    setErr('');
    const token = getToken();
    const isMock = !reservationId || reservationId.startsWith('mock');

    try {
      if (!isMock && token) {
        const data = await apiFetch<{ success: boolean; message?: string; code?: string }>(
          `/reservations/${reservationId}/pay`,
          { method: 'POST', body: '{}' },
        );
        if (!data.success) throw new Error(data.message);
        setCode(data.code || '');
        setDone(true);
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
      setCode('SNS-' + Math.random().toString(36).slice(2, 8).toUpperCase());
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در پرداخت');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="page page-narrow">
        <div className="panel" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem' }}>پرداخت با موفقیت ثبت شد</h1>
          <p className="subtitle">کد رزرو: {code || '—'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            پس از راه‌اندازی SMS، جزئیات برای {name} ارسال خواهد شد.
          </p>
          <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
            <Link href="/profile" className="btn btn-primary">
              رزروهای من
            </Link>
            <Link href="/" className="btn btn-secondary">
              خانه
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <header className="page-hero">
        <p className="eyebrow">پرداخت</p>
        <h1>تأیید و پرداخت رزرو</h1>
      </header>
      <div className="panel">
        <div className="data-table-wrap" style={{ border: 'none' }}>
          <table className="data-table">
            <tbody>
              <tr>
                <th>مجموعه</th>
                <td>{pitchName}</td>
              </tr>
              <tr>
                <th>تاریخ</th>
                <td>{date}</td>
              </tr>
              <tr>
                <th>سانس</th>
                <td>{time}</td>
              </tr>
              <tr>
                <th>مبلغ</th>
                <td>{priceFa(amount)} تومان</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="notice" style={{ marginTop: '1rem' }}>
          درگاه بانکی به‌زودی فعال می‌شود. فعلاً پرداخت آزمایشی برای تکمیل جریان رزرو
          است.
        </p>
        {err && <p className="form-msg err">{err}</p>}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
          onClick={payDemo}
        >
          پرداخت آزمایشی
        </button>
      </div>
    </div>
  );
}
