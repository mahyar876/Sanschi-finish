'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoFinanceStats } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';

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
