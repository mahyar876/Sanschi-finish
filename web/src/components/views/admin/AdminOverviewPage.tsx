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
import { getDemoAdminReservations } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { fetchAllPitches } from '@/lib/pitch-service';
import { apiFetch } from '@/lib/fetch-api';

export function AdminOverviewPage() {
  const [pitchCount, setPitchCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [resCount, setResCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [ownerCancels, setOwnerCancels] = useState<
    { label: string; count: number }[]
  >([]);

  useEffect(() => {
    void fetchAllPitches().then((p) => {
      setPitchCount(p.length);
      setActiveCount(p.filter((x) => x.isActive).length);
    });
    if (isDemoFrontend()) {
      const r = getDemoAdminReservations();
      setResCount(r.length);
      setPending(r.filter((x) => x.status === 'pending').length);
      setRevenue(r.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0));
      return;
    }
    void apiFetch<{ success: boolean; reservations: { status: string; amount: number }[] }>(
      '/reservations',
    )
      .then((d) => {
        if (!d.success) return;
        const r = d.reservations;
        setResCount(r.length);
        setPending(r.filter((x) => x.status === 'pending').length);
        setRevenue(r.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0));
      })
      .catch(() => {
        const r = getDemoAdminReservations();
        setResCount(r.length);
        setPending(r.filter((x) => x.status === 'pending').length);
        setRevenue(r.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0));
      });
    if (!isDemoFrontend()) {
      void apiFetch<{
        success: boolean;
        summary: { label: string; count: number }[];
      }>('/admin/reports/owner-cancellations?days=90')
        .then((d) => {
          if (d.success) setOwnerCancels(d.summary.slice(0, 5));
        })
        .catch(() => {});
    }
  }, []);

  return (
    <>
      <PageIntro
        title="داشبورد مدیریت"
        description="خلاصه وضعیت مجموعه‌ها، رزروها و میانبرهای پرکاربرد."
      />
      <StatGrid>
        <StatCard label="مجموعه‌ها" value={pitchCount} hint={`${activeCount} فعال`} />
        <StatCard label="رزروها" value={resCount} hint={`${pending} در انتظار`} />
        <StatCard label="درآمد پرداخت‌شده" value={priceFa(revenue)} />
        <StatCard label="تسویه" value="—" hint="از منوی مالی" />
      </StatGrid>
      <ActionsPanel title="میانبرها" description="دسترسی سریع به بخش‌های اصلی">
        <div className="dash-shortcuts">
          <Link href="/admin/pitches/new" className="btn btn-primary">
            افزودن زمین
          </Link>
          <Link href="/admin/reservations" className="btn btn-secondary">
            رزروها
          </Link>
          <Link href="/admin/slots" className="btn btn-secondary">
            سانس و قیمت
          </Link>
          <Link href="/admin/discounts" className="btn btn-secondary">
            کدهای تخفیف
          </Link>
          {isDemoFrontend() && (
            <Link href="/payment/test" className="btn btn-ghost">
              پرداخت آزمایشی
            </Link>
          )}
          <Link href="/admin/penalty" className="btn btn-ghost">
            تنظیم پنالتی
          </Link>
        </div>
      </ActionsPanel>
      {ownerCancels.length > 0 && (
        <DataSection title="لغو توسط مالک (۹۰ روز)">
          <ul className="msg-inbox">
            {ownerCancels.map((row) => (
              <li key={row.label} className="msg-inbox-item panel">
                <strong>{row.label}</strong>
                <span className="muted-sm"> · {row.count} لغو</span>
              </li>
            ))}
          </ul>
        </DataSection>
      )}
      <DataSection title="راهنما">
        <p className="subtitle" style={{ margin: 0 }}>
          تغییرات زمین و سانس در حالت دمو در مرورگر ذخیره می‌شود. با اتصال API، همان فرم‌ها
          مستقیماً روی سرور اعمال می‌شوند.
        </p>
      </DataSection>
    </>
  );
}
