'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/fetch-api';
import { priceFa } from '@/lib/format';

const adminNav = [
  { href: '/admin', label: 'مدیریت' },
  { href: '/admin/finance', label: 'مالی کل' },
  { href: '/settlement', label: 'تسویه‌ها' },
];

export function AdminFinanceView() {
  const [stats, setStats] = useState<{
    totals?: { gross: number; commission: number; net: number; count: number };
  }>({});

  useEffect(() => {
    void apiFetch<{ success: boolean; totals: typeof stats.totals }>(
      '/settlements/summary',
    ).then((d) => {
      if (d.success) setStats({ totals: d.totals });
    });
  }, []);

  const t = stats.totals;

  return (
    <DashboardShell
      title="داشبورد مالی"
      subtitle="خلاصه تسویه‌ها و کارمزد پلتفرم"
      nav={adminNav}
      requireRole="admin"
    >
      <div className="stat-row">
        <div className="stat-card">
          <div className="label">تعداد تسویه</div>
          <div className="value">{t?.count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">ناخالص</div>
          <div className="value">{priceFa(t?.gross ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">کارمزد سانس‌چی</div>
          <div className="value">{priceFa(t?.commission ?? 0)}</div>
          <div className="hint">نمایش ساختار — مقدار فعلی معمولاً ۰</div>
        </div>
        <div className="stat-card">
          <div className="label">خالص مالکان</div>
          <div className="value">{priceFa(t?.net ?? 0)}</div>
        </div>
      </div>
      <p className="notice">
        برای جزئیات هر تسویه به بخش{' '}
        <a href="/settlement">تسویه‌ها</a> بروید.
      </p>
    </DashboardShell>
  );
}
