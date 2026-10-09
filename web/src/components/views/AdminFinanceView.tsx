'use client';

import { useEffect, useState } from 'react';
import { PageIntro, StatCard, StatGrid } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoFinanceStats } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';

export function AdminFinanceView() {
  const [stats, setStats] = useState<{
    totals?: { gross: number; commission: number; net: number; count: number };
  }>({});

  useEffect(() => {
    if (isDemoFrontend()) {
      const s = getDemoFinanceStats();
      setStats({
        totals: {
          gross: s.totalRevenue,
          commission: Math.round(s.totalRevenue * 0.05),
          net: Math.round(s.totalRevenue * 0.95),
          count: s.paidCount,
        },
      });
      return;
    }
    void apiFetch<{ success: boolean; totals: typeof stats.totals }>(
      '/settlements/summary',
    )
      .then((d) => {
        if (d.success) setStats({ totals: d.totals });
      })
      .catch(() => {
        const s = getDemoFinanceStats();
        setStats({
          totals: {
            gross: s.totalRevenue,
            commission: Math.round(s.totalRevenue * 0.05),
            net: Math.round(s.totalRevenue * 0.95),
            count: s.paidCount,
          },
        });
      });
  }, []);

  const t = stats.totals;

  return (
    <>
      <PageIntro title="داشبورد مالی" description="خلاصه تسویه‌ها و کارمزد پلتفرم" />
      <StatGrid>
        <StatCard label="تعداد تسویه" value={t?.count ?? 0} />
        <StatCard label="ناخالص" value={priceFa(t?.gross ?? 0)} />
        <StatCard
          label="کارمزد سانس‌چی"
          value={priceFa(t?.commission ?? 0)}
          hint="نمایش ساختار"
        />
        <StatCard label="خالص مالکان" value={priceFa(t?.net ?? 0)} />
      </StatGrid>
      <p className="notice">
        برای جزئیات هر تسویه به بخش <a href="/settlement">تسویه‌ها</a> بروید.
      </p>
    </>
  );
}
