'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import { getDemoFinanceStats } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { adminCreditWallet } from '@/lib/wallet';

type Overview = {
  reservations?: {
    paidCount: number;
    grossPaid: number;
    commissionAccrued: number;
    ownerShareAccrued: number;
    unsettledPaidCount: number;
  };
  settlements?: { pending: number; approved: number };
  owners?: { withPitches: number };
};

type Summary = {
  byStatus?: Record<
    string,
    { count: number; gross: number; commission: number; net: number }
  >;
  totals?: { gross: number; commission: number; net: number; count: number };
};

export function AdminFinanceView() {
  const [overview, setOverview] = useState<Overview>({});
  const [summary, setSummary] = useState<Summary>({});
  const [creditPhone, setCreditPhone] = useState('');
  const [creditAmount, setCreditAmount] = useState('500000');
  const [creditNote, setCreditNote] = useState('');
  const [creditMsg, setCreditMsg] = useState('');
  const [creditErr, setCreditErr] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  useEffect(() => {
    if (isDemoFrontend()) {
      const s = getDemoFinanceStats();
      setOverview({
        reservations: {
          paidCount: s.paidCount,
          grossPaid: s.totalRevenue,
          commissionAccrued: Math.round(s.totalRevenue * 0.08),
          ownerShareAccrued: Math.round(s.totalRevenue * 0.92),
          unsettledPaidCount: 2,
        },
        settlements: { pending: 1, approved: 0 },
        owners: { withPitches: 3 },
      });
      setSummary({
        totals: {
          count: 4,
          gross: s.totalRevenue,
          commission: Math.round(s.totalRevenue * 0.08),
          net: Math.round(s.totalRevenue * 0.92),
        },
      });
      return;
    }
    void apiFetch<{ success: boolean } & Overview>('/admin/finance/overview').then((d) => {
      if (d.success) setOverview(d);
    });
    void apiFetch<{ success: boolean } & Summary>('/settlements/summary').then((d) => {
      if (d.success) setSummary(d);
    });
  }, []);

  const r = overview.reservations;
  const pending = summary.byStatus?.pending;

  async function submitWalletCredit() {
    setCreditMsg('');
    setCreditErr('');
    const phone = creditPhone.replace(/\D/g, '').trim();
    const amount = parseInt(creditAmount.replace(/\D/g, ''), 10);
    if (!phone || phone.length < 10) {
      setCreditErr('شماره موبایل کاربر را وارد کنید');
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setCreditErr('مبلغ نامعتبر');
      return;
    }
    if (isDemoFrontend()) {
      setCreditMsg('در حالت نمایشی اعتبار واقعی ثبت نمی‌شود');
      return;
    }
    setCreditLoading(true);
    try {
      const { balance } = await adminCreditWallet({
        phone,
        amount,
        note: creditNote.trim() || undefined,
      });
      setCreditMsg(`اعتبار ثبت شد — موجودی جدید: ${priceFa(balance)} تومان`);
      setCreditPhone('');
      setCreditNote('');
    } catch (e) {
      setCreditErr(e instanceof ApiError ? e.message : 'خطا');
    } finally {
      setCreditLoading(false);
    }
  }

  return (
    <>
      <PageIntro
        title="داشبورد مالی"
        description="درآمد پلتفرم، سهم مالکان و صف تسویه — چند مجموعه و چند مالک"
      />
      <StatGrid>
        <StatCard
          label="رزرو پرداخت‌شده"
          value={r?.paidCount ?? 0}
          hint={`${r?.unsettledPaidCount ?? 0} هنوز در تسویه نیامده`}
        />
        <StatCard label="گردش مشتری (GMV)" value={priceFa(r?.grossPaid ?? 0)} />
        <StatCard
          label="کارمزد سانس‌چی (ثبت‌شده)"
          value={priceFa(r?.commissionAccrued ?? 0)}
          hint="از snapshot هر رزرو"
        />
        <StatCard label="سهم مالکان" value={priceFa(r?.ownerShareAccrued ?? 0)} />
      </StatGrid>

      <StatGrid>
        <StatCard
          label="تسویه در صف"
          value={overview.settlements?.pending ?? pending?.count ?? 0}
          hint="نیاز به تأیید/پرداخت"
        />
        <StatCard label="تأیید‌شده (پرداخت نشده)" value={overview.settlements?.approved ?? 0} />
        <StatCard label="مالک فعال" value={overview.owners?.withPitches ?? 0} />
        <StatCard
          label="اسناد تسویه"
          value={summary.totals?.count ?? 0}
          hint={`خالص: ${priceFa(summary.totals?.net ?? 0)}`}
        />
      </StatGrid>

      <ActionsPanel
        title="اعتبار کیف پول بازیکن"
        description="برای جبران لغو، تبلیغ یا شارژ دستی — مبلغ فوراً در کیف پول کاربر می‌نشیند"
      >
        <div className="form-grid" style={{ maxWidth: 520 }}>
          <div className="field">
            <label htmlFor="wallet-credit-phone">موبایل کاربر</label>
            <input
              id="wallet-credit-phone"
              inputMode="tel"
              value={creditPhone}
              onChange={(e) => setCreditPhone(e.target.value)}
              placeholder="09123456789"
            />
          </div>
          <div className="field">
            <label htmlFor="wallet-credit-amount">مبلغ (تومان)</label>
            <input
              id="wallet-credit-amount"
              inputMode="numeric"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="wallet-credit-note">توضیح (اختیاری)</label>
            <input
              id="wallet-credit-note"
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              placeholder="مثلاً جبران لغو سانس"
            />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={creditLoading}
          onClick={() => void submitWalletCredit()}
        >
          {creditLoading ? 'در حال ثبت…' : 'ثبت اعتبار'}
        </button>
        {creditMsg && <p className="form-msg ok">{creditMsg}</p>}
        {creditErr && <p className="form-msg err">{creditErr}</p>}
      </ActionsPanel>

      <ActionsPanel title="میانبرها">
        <div className="hero-actions">
          <Link href="/settlement" className="btn btn-primary btn-sm">
            مدیریت تسویه‌ها
          </Link>
          <Link href="/admin/reservations" className="btn btn-secondary btn-sm">
            همه رزروها
          </Link>
          <Link href="/admin/pitches" className="btn btn-ghost btn-sm">
            کمیسیون هر زمین
          </Link>
        </div>
      </ActionsPanel>
    </>
  );
}
