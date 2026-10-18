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
import { apiFetch } from '@/lib/fetch-api';
import { fetchOwnerDashboard } from '@/lib/owner-api';
import { displaySlotTime } from '@/lib/slot-time';

type ReservationRow = {
  _id: string;
  code: string;
  status: string;
  bookingStatus?: string;
  date: string;
  slotTime: string;
  amount: number;
};

export function OwnerDashboardView() {
  const { pitchId, pitches } = useOwnerPitches();
  const [stats, setStats] = useState(getDemoOwnerDashboardStats());
  const [recent, setRecent] = useState<ReservationRow[]>(
    getDemoOwnerReservations().slice(0, 5) as ReservationRow[],
  );

  useEffect(() => {
    if (isDemoFrontend() || !pitchId) {
      setStats(getDemoOwnerDashboardStats(pitchId || undefined));
      setRecent(getDemoOwnerReservations().slice(0, 5) as ReservationRow[]);
      return;
    }
    void fetchOwnerDashboard(pitchId)
      .then((d) => {
        if (d.success) {
          const s = d.stats;
          setStats((prev) => ({
            ...prev,
            todayCount: s.todayCount,
            futureCount: s.futureCount,
            revenueToday: s.revenueToday,
            revenueMonth: s.revenueMonth,
            emptySlots: s.emptySlots,
            pending: s.pending,
            pitchName: s.pitchName,
            emptySoon: s.emptySoon,
          }));
        }
      })
      .catch(() => setStats(getDemoOwnerDashboardStats(pitchId)));

    void apiFetch<{ success: boolean; reservations: ReservationRow[] }>(
      `/owner/pitches/${pitchId}/reservations`,
    )
      .then((d) => {
        if (d.success) setRecent(d.reservations.slice(0, 5));
      })
      .catch(() => {
        setRecent(getDemoOwnerReservations().slice(0, 5) as ReservationRow[]);
      });
  }, [pitchId]);

  const emptySoon = stats.emptySoon;

  return (
    <>
      <PageIntro
        title="داشبورد صاحب زمین"
        description="خلاصه رزرو، درآمد و وضعیت سانس‌های مجموعه شما."
      />
      {pitches.length === 0 && (
        <p className="notice">هنوز مجموعه‌ای به حساب شما متصل نشده است.</p>
      )}
      {emptySoon != null && emptySoon > 0 && (
        <p className="notice owner-flash-notice">
          {emptySoon} سانس خالی تا ۲۴ ساعت آینده — از{' '}
          <Link href="/owner/slots">مدیریت سانس</Link> می‌توانید رزرو تلفنی ثبت کنید یا تخفیف
          لحظه‌آخر را فعال نگه دارید.
        </p>
      )}
      <StatGrid>
        <StatCard label="رزروهای امروز" value={stats.todayCount} />
        <StatCard label="رزروهای آینده" value={stats.futureCount} />
        <StatCard label="درآمد امروز (سهم شما)" value={priceFa(stats.revenueToday)} />
        <StatCard label="درآمد ماه" value={priceFa(stats.revenueMonth)} />
        <StatCard label="سانس خالی امروز" value={stats.emptySlots} />
        <StatCard label="در انتظار پرداخت" value={stats.pending} />
      </StatGrid>

      <ActionsPanel title="میانبرها" description="دسترسی سریع به بخش‌های پرکاربرد">
        <div className="dash-shortcuts">
          <Link href="/owner/slots" className="btn btn-primary">
            مدیریت سانس / رزرو تلفنی
          </Link>
          <Link href="/owner/reservations" className="btn btn-secondary">
            رزروها و ورود
          </Link>
          <Link href="/owner/customers" className="btn btn-secondary">
            مشتریان VIP
          </Link>
          <Link href="/owner/reports" className="btn btn-secondary">
            گزارش‌ها
          </Link>
          <Link href="/finance" className="btn btn-ghost">
            درآمد
          </Link>
        </div>
      </ActionsPanel>

      <DataSection title="آخرین رزروها">
        <p className="subtitle" style={{ margin: '0 0 0.75rem' }}>
          {pitches.find((p) => p._id === pitchId)?.name || pitches[0]?.name || 'مجموعه'}
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
                  <td data-label="سانس">{displaySlotTime(r.slotTime)}</td>
                  <td data-label="مبلغ">{priceFa(r.amount)}</td>
                  <td data-label="وضعیت">
                    <span className={`badge ${statusBadgeClass(r.bookingStatus || r.status)}`}>
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
