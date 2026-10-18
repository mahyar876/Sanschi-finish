'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import { markDemoReservationPaid, upsertDemoReservation } from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { getToken, getUser } from '@/lib/session';
import { priceFa } from '@/lib/format';
import { applyLocalDiscountCode } from '@/lib/local-discounts';
import { numFa } from '@/lib/jalali';
import { debitDemoWallet, fetchWalletBalance } from '@/lib/wallet';
import { displaySlotTime } from '@/lib/slot-time';
import { isMockPayEnabled } from '@/lib/mock-pay';
import { ReservationQr } from '@/components/ReservationQr';

export function PaymentView() {
  const search = useSearchParams();
  const reservationId = search.get('reservationId') || '';
  const recurringGroupId = search.get('recurringGroupId') || '';
  const pitchId = search.get('pitchId') || '';
  const initialAmount = parseInt(search.get('amount') || '0', 10);
  const pitchName = search.get('pitchName') || '—';
  const date = search.get('date') || '—';
  const time = search.get('time') || '—';
  const timeLabel = displaySlotTime(time);
  const recurringWeeks = parseInt(search.get('weeks') || '0', 10);
  const weeklyAmount = parseInt(search.get('weeklyAmount') || '0', 10);
  const firstWeekAmount = parseInt(search.get('firstWeekAmount') || '0', 10);
  const regularWeekAmount = parseInt(search.get('regularWeekAmount') || '0', 10);
  const recurringPriceSplit =
    firstWeekAmount > 0 &&
    regularWeekAmount > 0 &&
    firstWeekAmount !== regularWeekAmount;
  const name = search.get('name') || '—';
  const payResult = search.get('payResult');
  const refId = search.get('refId') || '';

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(payResult === 'success');
  const [err, setErr] = useState(payResult === 'failed' ? 'پرداخت ناموفق یا لغو شد' : '');
  const [code, setCode] = useState(search.get('code') || '');
  const [lockNote, setLockNote] = useState('');
  const [subtotal] = useState(initialAmount);
  const [finalAmount, setFinalAmount] = useState(initialAmount);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [discMsg, setDiscMsg] = useState('');
  const [discLoading, setDiscLoading] = useState(false);
  const [discountLocked, setDiscountLocked] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [policyLines, setPolicyLines] = useState<string[]>([]);

  const walletApply = useMemo(() => {
    if (!useWalletBalance || recurringGroupId || !getToken()) return 0;
    if (!reservationId || reservationId.startsWith('mock')) return 0;
    return Math.min(walletBalance, finalAmount);
  }, [useWalletBalance, walletBalance, finalAmount, reservationId, recurringGroupId]);

  const gatewayDue = Math.max(0, finalAmount - walletApply);
  const mockPay = isMockPayEnabled();
  const isEphemeralMock =
    !reservationId || reservationId.startsWith('mock') || isDemoFrontend();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void fetchWalletBalance()
      .then(setWalletBalance)
      .catch(() => setWalletBalance(0));
  }, [finalAmount, done]);

  useEffect(() => {
    if (payResult === 'success' && search.get('code')) {
      setCode(search.get('code') || '');
      setDone(true);
    }
  }, [payResult, search]);

  useEffect(() => {
    const token = getToken();
    const isMock = !reservationId || reservationId.startsWith('mock');
    if (isMock || isDemoFrontend() || !token) return;

    if (recurringGroupId) return;

    void apiFetch<{
      success: boolean;
      reservation?: {
        lockExpiresAt?: string;
        code?: string;
        status?: string;
        paymentStatus?: string;
        bookingStatus?: string;
      };
    }>(`/reservations/${reservationId}`)
      .then((data) => {
        const r = data.reservation;
        if (!data.success || !r) return;
        const paid =
          r.paymentStatus === 'successful' ||
          r.status === 'paid' ||
          r.bookingStatus === 'confirmed';
        if (paid) {
          if (r.code) setCode(r.code);
          setDone(true);
          return;
        }
        return apiFetch<{ success: boolean; reservation?: { lockExpiresAt?: string } }>(
          `/reservations/${reservationId}/revalidate`,
          { method: 'POST', body: '{}' },
        ).then((rev) => {
          if (rev.success && rev.reservation?.lockExpiresAt) {
            setLockNote(
              'زمان باقی‌مانده برای پرداخت محدود است؛ در صورت انقضا سانس آزاد می‌شود.',
            );
          }
        });
      })
      .catch((e) => {
        if (e instanceof ApiError) setErr(e.message);
      });
  }, [reservationId, recurringGroupId]);

  useEffect(() => {
    void apiFetch<{ success: boolean; lines: string[] }>('/reservations/cancel-policy')
      .then((data) => {
        if (data.success && data.lines?.length) setPolicyLines(data.lines);
      })
      .catch(() => {});
  }, []);

  async function applyDiscount() {
    setDiscMsg('');
    const code = discountInput.trim().toUpperCase();
    if (!code) {
      setDiscMsg('کد تخفیف را وارد کنید');
      return;
    }
    if (discountLocked) return;
    if (recurringGroupId) {
      setDiscMsg('برای رزرو تکراری فعلاً کد تخفیف در همین صفحه پشتیبانی نمی‌شود');
      return;
    }

    setDiscLoading(true);
    try {
      const token = getToken();
      const isMock =
        !reservationId || reservationId.startsWith('mock') || isDemoFrontend();

      if (isMock || !token) {
        const r = applyLocalDiscountCode(code, subtotal);
        if (!r.ok) {
          setDiscMsg(r.message);
          return;
        }
        setDiscountAmount(r.discountAmount);
        setFinalAmount(Math.max(0, subtotal - r.discountAmount));
        setAppliedCode(code);
        setDiscountLocked(true);
        setDiscMsg(`کد اعمال شد — ${numFa(r.percent)}٪ تخفیف`);
        return;
      }

      const data = await apiFetch<{
        success: boolean;
        message?: string;
        amount?: number;
        discountAmount?: number;
        code?: string;
        percent?: number;
      }>(`/reservations/${reservationId}/discount`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (!data.success) throw new Error(data.message);
      const d = data.discountAmount ?? 0;
      const total = data.amount ?? subtotal;
      setDiscountAmount(d);
      setFinalAmount(total);
      setAppliedCode(data.code || code);
      setDiscountLocked(true);
      setDiscMsg(
        data.percent != null
          ? `کد اعمال شد — ${numFa(data.percent)}٪ تخفیف`
          : 'کد تخفیف اعمال شد',
      );
    } catch (e) {
      setDiscMsg(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'خطا');
    } finally {
      setDiscLoading(false);
    }
  }

  async function syncPayment() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<{
        success: boolean;
        synced?: boolean;
        message?: string;
        code?: string;
        paymentStatus?: string;
      }>('/payment/zarinpal/sync', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: reservationId || undefined,
          recurringGroupId: recurringGroupId || undefined,
        }),
      });
      if (data.synced && data.paymentStatus === 'successful') {
        if (data.code) setCode(data.code);
        setDone(true);
        return;
      }
      setErr(data.message || 'هنوز پرداخت تأیید نشده است');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'خطا در استعلام');
    } finally {
      setLoading(false);
    }
  }

  const canPayWithWallet =
    finalAmount > 0 &&
    walletBalance >= finalAmount &&
    Boolean(reservationId) &&
    !reservationId.startsWith('mock') &&
    !recurringGroupId &&
    Boolean(getToken());

  async function payWithWallet() {
    setLoading(true);
    setErr('');
    const token = getToken();
    if (!token) {
      setErr('ابتدا وارد حساب شوید');
      setLoading(false);
      return;
    }
    if (!canPayWithWallet) {
      setErr('موجودی کیف پول برای این مبلغ کافی نیست');
      setLoading(false);
      return;
    }
    try {
      if (isDemoFrontend() || token.startsWith('demo-token')) {
        debitDemoWallet(finalAmount, `رزرو ${pitchName}`);
        const isMock =
          !reservationId || reservationId.startsWith('mock') || isDemoFrontend();
        await payDemoInternal(token, isMock);
        setWalletBalance(await fetchWalletBalance());
        return;
      }
      await apiFetch(`/reservations/${reservationId}/revalidate`, {
        method: 'POST',
        body: '{}',
      });
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        code?: string;
        walletBalance?: number;
      }>(`/reservations/${reservationId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'wallet' }),
      });
      if (!data.success) throw new Error(data.message);
      setCode(data.code || '');
      if (typeof data.walletBalance === 'number') setWalletBalance(data.walletBalance);
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  async function payWithMockReservation() {
    setLoading(true);
    setErr('');
    const token = getToken();
    try {
      if (isEphemeralMock) {
        await payDemoInternal(token, true);
        return;
      }
      if (!token) {
        setErr('ابتدا وارد حساب شوید');
        return;
      }
      if (recurringGroupId) {
        setErr('برای رزرو تکراری فعلاً فقط درگاه واقعی فعال است');
        return;
      }
      await apiFetch(`/reservations/${reservationId}/revalidate`, {
        method: 'POST',
        body: '{}',
      });
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        code?: string;
        alreadyPaid?: boolean;
      }>(`/reservations/${reservationId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'mock' }),
      });
      if (!data.success) throw new Error(data.message);
      setCode(data.code || '');
      setDone(true);
      if (data.alreadyPaid) setErr('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'خطا در پرداخت');
    } finally {
      setLoading(false);
    }
  }

  async function payWithGateway() {
    setLoading(true);
    setErr('');
    const token = getToken();

    try {
      if (mockPay || isEphemeralMock) {
        await payWithMockReservation();
        return;
      }

      if (!token) {
        setErr('ابتدا وارد حساب شوید');
        return;
      }

      if (reservationId && !recurringGroupId) {
        await apiFetch(`/reservations/${reservationId}/revalidate`, {
          method: 'POST',
          body: '{}',
        });
      }

      const returnQuery = typeof window !== 'undefined' ? window.location.search.slice(1) : '';
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        url?: string;
        paid?: boolean;
        code?: string;
        walletUsed?: number;
      }>('/payment/zarinpal/request', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: reservationId || undefined,
          recurringGroupId: recurringGroupId || undefined,
          returnQuery,
          applyWallet: walletApply > 0,
        }),
      });
      if (!data.success) throw new Error(data.message || 'خطا در اتصال به درگاه');
      if (data.paid && data.code) {
        setCode(data.code);
        if (typeof data.walletUsed === 'number') {
          setWalletBalance((b) => Math.max(0, b - data.walletUsed!));
        }
        setDone(true);
        return;
      }
      if (!data.url) throw new Error(data.message || 'خطا در اتصال به درگاه');
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'خطا در پرداخت');
    } finally {
      setLoading(false);
    }
  }

  async function payDemoInternal(token: string | null, isMock: boolean) {
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
    const codeVal = 'SNS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    setCode(codeVal);
    if (isDemoFrontend()) {
      const id = reservationId || 'mock-' + Date.now();
      markDemoReservationPaid(id, codeVal);
      upsertDemoReservation({
        _id: id,
        code: codeVal,
        status: 'paid',
        date,
        slotTime: time,
        amount: finalAmount,
        pitch: { name: pitchName },
      });
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="page page-narrow">
        <div className="panel" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem' }}>رزرو با موفقیت انجام شد</h1>
          <p className="subtitle">کد رزرو: {code || '—'}</p>
          {refId && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              شماره پیگیری: {refId}
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {pitchName} · {date} · {timeLabel}
          </p>
          {code ? (
            <div style={{ marginTop: '1rem' }}>
              <ReservationQr code={code} size={160} />
            </div>
          ) : null}
          {!recurringGroupId && finalAmount > 0 ? (
            <p className="muted-sm" style={{ marginTop: '1rem' }}>
              تقسیم سهم و «کی زده؟» را در{' '}
              <Link href="/player/reservations">پنل بازیکن → رزروهای من</Link> مدیریت کنید.
            </p>
          ) : null}
          <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
            <Link href="/player/reservations" className="btn btn-primary">
              مشاهده جزئیات رزرو
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
        {mockPay && !recurringGroupId ? (
          <p className="subtitle">
            حالت تست — با دکمهٔ پرداخت، رزرو بدون درگاه بانکی تأیید می‌شود (Mongo + قفل سانس واقعی).
          </p>
        ) : null}
      </header>
      <div className="panel">
        <div className="data-table-wrap" style={{ border: 'none' }}>
          <table className="data-table responsive-stack">
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
                <td>{timeLabel}</td>
              </tr>
              {recurringGroupId && recurringWeeks >= 2 && (
                <>
                  <tr>
                    <th>نوع</th>
                    <td>رزرو تکراری — {numFa(recurringWeeks)} هفته</td>
                  </tr>
                  {recurringPriceSplit ? (
                    <>
                      <tr>
                        <th>هفته اول (لحظه‌آخر)</th>
                        <td>{priceFa(firstWeekAmount)} تومان</td>
                      </tr>
                      <tr>
                        <th>هر هفته بعد</th>
                        <td>{priceFa(regularWeekAmount)} تومان</td>
                      </tr>
                    </>
                  ) : (
                    weeklyAmount > 0 && (
                      <tr>
                        <th>هر هفته</th>
                        <td>{priceFa(weeklyAmount)} تومان</td>
                      </tr>
                    )
                  )}
                </>
              )}
              <tr>
                <th>{recurringGroupId ? 'جمع کل' : 'مبلغ'}</th>
                <td>{priceFa(subtotal)} تومان</td>
              </tr>
              {discountAmount > 0 && (
                <tr>
                  <th>تخفیف</th>
                  <td>− {priceFa(discountAmount)} تومان</td>
                </tr>
              )}
              <tr>
                <th>قابل پرداخت</th>
                <td>
                  <strong>{priceFa(finalAmount)} تومان</strong>
                  {walletApply > 0 && gatewayDue > 0 ? (
                    <span className="muted-sm" style={{ display: 'block', marginTop: '0.35rem' }}>
                      {priceFa(walletApply)} از کیف پول + {priceFa(gatewayDue)} درگاه
                    </span>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {policyLines.length > 0 ? (
          <div className="panel" style={{ marginTop: '1rem' }}>
            <h2 className="h6" style={{ marginTop: 0 }}>
              سیاست لغو و بازپرداخت
            </h2>
            <ul className="muted-sm" style={{ margin: 0, paddingInlineStart: '1.2rem' }}>
              {policyLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="panel payment-discount-panel" style={{ marginTop: '1rem' }}>
          <h2 className="payment-discount-title">کد تخفیف</h2>
          <p className="muted-sm">
            هر کد معتبر (استوری، کمپین، پنالتی، ادمین) را قبل از پرداخت وارد کنید.
          </p>
          <div className="payment-discount-row">
            <input
              type="text"
              className="payment-discount-input"
              placeholder="مثلاً SNS5-XXXXXX"
              value={discountInput}
              disabled={discountLocked}
              onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyDiscount();
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={discLoading || discountLocked}
              onClick={() => void applyDiscount()}
            >
              {discLoading ? '…' : 'اعمال'}
            </button>
          </div>
          {appliedCode && discountLocked && (
            <p className="payment-discount-badge">🎟 {appliedCode}</p>
          )}
          {discMsg && (
            <p className={`muted-sm${discMsg.includes('اعمال') ? ' form-msg ok' : ''}`}>{discMsg}</p>
          )}
          {!pitchId && !isDemoFrontend() && (
            <p className="muted-sm">برای اعمال کد سرور، رزرو باید از مسیر تأیید ثبت شده باشد.</p>
          )}
        </div>

        {getToken() && !recurringGroupId && walletBalance > 0 && reservationId && !reservationId.startsWith('mock') ? (
          <div className="wallet-pay-panel">
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>کیف پول</p>
            <p className="muted-sm" style={{ margin: '0 0 0.5rem' }}>
              موجودی: <strong>{priceFa(walletBalance)}</strong> تومان
            </p>
            <label className="muted-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={useWalletBalance}
                onChange={(e) => setUseWalletBalance(e.target.checked)}
              />
              {walletApply >= finalAmount
                ? 'پرداخت کامل از کیف پول'
                : walletApply > 0
                  ? `کسر ${priceFa(walletApply)} از کیف پول؛ مابقی از درگاه`
                  : 'موجودی کافی نیست — فقط درگاه'}
            </label>
            {canPayWithWallet ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                disabled={loading}
                onClick={() => void payWithWallet()}
              >
                پرداخت کامل با کیف پول
              </button>
            ) : walletBalance < finalAmount ? (
              <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
                <Link href="/player/wallet">شارژ کیف پول</Link>
                {' · '}
                یا با دکمهٔ درگاه، موجودی فعلی به‌صورت خودکار کم می‌شود.
              </p>
            ) : null}
          </div>
        ) : null}

        {lockNote && <p className="notice">{lockNote}</p>}
        {err && <p className="form-msg err">{err}</p>}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
          onClick={() => void payWithGateway()}
        >
          {mockPay || isEphemeralMock
            ? 'پرداخت آزمایشی (بدون درگاه)'
            : gatewayDue > 0 && walletApply > 0
              ? `پرداخت ${priceFa(gatewayDue)} در درگاه (+ کیف پول)`
              : 'پرداخت با درگاه بانکی'}
        </button>
        {!mockPay &&
          !isEphemeralMock &&
          !recurringGroupId && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={loading}
              onClick={syncPayment}
            >
              بررسی وضعیت پرداخت در سرور
            </button>
            <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
              پس از پرداخت، وضعیت تراکنش در سرور تأیید می‌شود؛ بازگشت از درگاه به‌تنهایی
              کافی نیست.
            </p>
          </>
        )}
        {mockPay && !isEphemeralMock ? (
          <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
            برای تست کیف پول:{' '}
            <Link href="/player/wallet">شارژ آزمایشی</Link>
            {' · '}
            <Link href="/payment/test">صفحهٔ پرداخت mock</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
