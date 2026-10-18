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
import { getDemoOwnerDashboardStats, getDemoOwnerReservations } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';
import { RESERVATION_STATUS_FA, statusBadgeClass } from '@/lib/reservation-status';

export function OwnerDashboardView() {
  const { pitchId, pitches } = useOwnerPitches();
  const [stats, setStats] = useState(getDemoOwnerDashboardStats());

  useEffect(() => {
    setStats(getDemoOwnerDashboardStats(pitchId || undefined));
  }, [pitchId]);

  const recent = getDemoOwnerReservations().slice(0, 5);

  return (
    <>
      <PageIntro
        title="داشبورد صاحب زمین"
        description="خلاصه رزرو، درآمد و وضعیت سانس‌های مجموعه شما."
      />
      {pitches.length === 0 && (
        <p className="notice">هنوز مجموعه‌ای به حساب شما متصل نشده است.</p>
      )}
      <StatGrid>
        <StatCard label="رزروهای امروز" value={stats.todayCount} />
        <StatCard label="رزروهای آینده" value={stats.futureCount} />
        <StatCard label="درآمد امروز" value={priceFa(stats.revenueToday)} />
        <StatCard label="درآمد ماه" value={priceFa(stats.revenueMonth)} />
        <StatCard label="سانس‌های خالی" value={stats.emptySlots} hint="امروز / نمایشی" />
        <StatCard label="در انتظار پرداخت" value={stats.pending} />
      </StatGrid>

      <ActionsPanel title="میانبرها" description="دسترسی سریع به بخش‌های پرکاربرد">
        <div className="dash-shortcuts">
          <Link href="/owner/slots" className="btn btn-primary">
            مدیریت سانس‌ها
          </Link>
          <Link href="/owner/reservations" className="btn btn-secondary">
            رزروها
          </Link>
          <Link href="/owner/pitches" className="btn btn-secondary">
            زمین‌های من
          </Link>
          <Link href="/finance" className="btn btn-ghost">
            درآمد
          </Link>
        </div>
      </ActionsPanel>

      <DataSection title="خلاصه عملکرد زمین">
        <p className="subtitle" style={{ margin: '0 0 0.75rem' }}>
          {pitches[0]?.name
            ? `مجموعه فعال: ${pitches.find((p) => p._id === pitchId)?.name || pitches[0].name}`
            : 'پس از اتصال زمین، آمار دقیق‌تر نمایش داده می‌شود.'}
          {isDemoFrontend() && ' (حالت نمایشی)'}
        </p>
        <div className="data-table-wrap owner-card-table-wrap">
          <table className="data-table owner-card-table">
            <thead>
              <tr>
                <th>کد</th>
                <th>تاریخ</th>
                <th>سانس</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r._id}>
                  <td data-label="کد">{r.code}</td>
                  <td data-label="تاریخ">{r.date}</td>
                  <td data-label="سانس">{r.slotTime}</td>
                  <td data-label="مبلغ">{priceFa(r.amount)}</td>
                  <td data-label="وضعیت">
                    <span className={`badge ${statusBadgeClass(r.status)}`}>
                      {RESERVATION_STATUS_FA[r.status] || r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
