'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  topupWalletDemo,
  walletTxLabel,
  type WalletTransaction,
} from '@/lib/wallet';
import { isDemoFrontend, showDevQuickLogin } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { numFa } from '@/lib/jalali';

export function PlayerWalletView() {
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('500000');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function reload() {
    setLoading(true);
    void Promise.all([fetchWalletBalance(), fetchWalletTransactions()])
      .then(([b, list]) => {
        setBalance(b);
        setTx(list);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'خطا'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function topup() {
    setMsg('');
    setErr('');
    const amount = parseInt(topupAmount.replace(/\D/g, ''), 10);
    if (!Number.isFinite(amount) || amount < 10_000) {
      setErr('حداقل ۱۰٬۰۰۰ تومان');
      return;
    }
    try {
      const next = await topupWalletDemo(amount);
      setBalance(next);
      setMsg('شارژ انجام شد');
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا');
    }
  }

  const canTopup = isDemoFrontend() || showDevQuickLogin();

  return (
    <>
      <PageIntro
        title="کیف پول"
        description="شارژ اعتبار و پرداخت رزرو بدون درگاه — موجودی فقط برای حساب شماست"
      />
      <StatGrid>
        <StatCard
          label="موجودی"
          value={loading ? '…' : `${priceFa(balance)} تومان`}
          hint="قابل استفاده در صفحه پرداخت"
        />
        <StatCard label="تراکنش اخیر" value={tx.length} />
      </StatGrid>

      {canTopup && (
        <ActionsPanel
          title="شارژ (لوکال / نمایشی)"
          description="در production شارژ از درگاه بانکی یا اعتبار مدیر فعال می‌شود"
        >
          <div className="field wallet-topup-field">
            <label htmlFor="wallet-topup-amount">مبلغ (تومان)</label>
            <div className="wallet-topup-inline">
              <input
                id="wallet-topup-amount"
                inputMode="numeric"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="500000"
              />
              <button type="button" className="btn btn-primary" onClick={() => void topup()}>
                شارژ کیف پول
              </button>
            </div>
          </div>
          {msg && <p className="form-msg ok">{msg}</p>}
          {err && <p className="form-msg err">{err}</p>}
        </ActionsPanel>
      )}

      <DataSection title="گردش حساب">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>نوع</th>
                <th>مبلغ</th>
                <th>مانده</th>
                <th>توضیح</th>
              </tr>
            </thead>
            <tbody>
              {tx.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted-sm">
                    هنوز تراکنشی نیست —{' '}
                    <Link href="/reserve">رزرو کنید</Link> یا کیف را شارژ کنید.
                  </td>
                </tr>
              )}
              {tx.map((row) => (
                <tr key={row._id}>
                  <td>{walletTxLabel(row.type)}</td>
                  <td>
                    {row.type === 'payment' ? '−' : '+'}
                    {priceFa(row.amount)}
                  </td>
                  <td>{priceFa(row.balanceAfter)}</td>
                  <td className="muted-sm">
                    {row.reservation?.code
                      ? `رزرو ${row.reservation.code}`
                      : row.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
          در صفحه پرداخت، اگر موجودی کافی باشد گزینه «پرداخت با کیف پول» فعال است.
          {balance > 0 && (
            <>
              {' '}
              موجودی فعلی: {numFa(balance.toLocaleString('en'))} تومان
            </>
          )}
        </p>
      </DataSection>
    </>
  );
}
