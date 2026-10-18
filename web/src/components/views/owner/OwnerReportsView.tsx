'use client';

import { useEffect, useState } from 'react';
import { PageIntro, StatGrid, StatCard, DataSection } from '@/components/dashboard/DashboardPageBlocks';
import { getDemoFinanceStats, getDemoOwnerDashboardStats } from '@/lib/demo-dashboard';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';
import { isDemoFrontend } from '@/lib/demo';
import { fetchOwnerReports, type OwnerReportsSummary } from '@/lib/owner-api';
import { displaySlotTime } from '@/lib/slot-time';

export function OwnerReportsView() {
  const { pitchId, pitches } = useOwnerPitches();
  const [summary, setSummary] = useState<OwnerReportsSummary | null>(null);

  useEffect(() => {
    if (!pitchId || isDemoFrontend()) {
      const fin = getDemoFinanceStats();
      const dash = getDemoOwnerDashboardStats();
      setSummary({
        paidCount: fin.paidCount,
        totalRevenue: fin.totalRevenue,
        topSlots: [
          { slotTime: '۱۸:۰۰–۱۹:۳۰', count: 12, revenue: 8_400_000 },
          { slotTime: '۱۹:۳۰–۲۱:۰۰', count: 10, revenue: 7_000_000 },
        ],
        byWeekday: [
          { weekday: 'پنج‌شنبه', count: dash.todayCount > 0 ? 8 : 4, revenue: 5_600_000 },
          { weekday: 'جمعه', count: 6, revenue: 4_200_000 },
        ],
      });
      return;
    }
    void fetchOwnerReports(pitchId)
      .then((d) => {
        if (d.success) setSummary(d.summary);
      })
      .catch(() => setSummary(null));
  }, [pitchId]);

  const fin = summary;

  return (
    <>
      <PageIntro title="گزارش‌ها" description="پرفروش‌ترین سانس و روزهای هفته — بر اساس رزروهای پرداخت‌شده." />
      {pitches.length > 1 && (
        <p className="subtitle muted-sm">
          مجموعه: {pitches.find((p) => p._id === pitchId)?.name}
        </p>
      )}
      {!fin ? (
        <p className="notice">گزارش در دسترس نیست.</p>
      ) : (
        <>
          <StatGrid>
            <StatCard label="رزرو پرداخت‌شده" value={fin.paidCount} />
            <StatCard label="درآمد کل (سهم شما)" value={priceFa(fin.totalRevenue)} />
          </StatGrid>

          <DataSection title="پرفروش‌ترین سانس">
            <div className="data-table-wrap owner-card-table-wrap">
              <table className="data-table owner-card-table">
                <thead>
                  <tr>
                    <th>سانس</th>
                    <th>تعداد</th>
                    <th>درآمد</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.topSlots.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted-sm owner-card-empty">
                        هنوز داده کافی نیست.
                      </td>
                    </tr>
                  )}
                  {fin.topSlots.map((s) => (
                    <tr key={s.slotTime}>
                      <td data-label="سانس">{displaySlotTime(s.slotTime)}</td>
                      <td data-label="تعداد">{s.count}</td>
                      <td data-label="درآمد">{priceFa(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataSection>

          <DataSection title="بر اساس روز هفته">
            <div className="data-table-wrap owner-card-table-wrap">
              <table className="data-table owner-card-table">
                <thead>
                  <tr>
                    <th>روز</th>
                    <th>تعداد</th>
                    <th>درآمد</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.byWeekday.map((w) => (
                    <tr key={w.weekday}>
                      <td data-label="روز">{w.weekday}</td>
                      <td data-label="تعداد">{w.count}</td>
                      <td data-label="درآمد">{priceFa(w.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataSection>
        </>
      )}
    </>
  );
}
