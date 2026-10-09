'use client';

import { PageIntro, StatGrid, StatCard, DataSection } from '@/components/dashboard/DashboardPageBlocks';
import { getDemoFinanceStats, getDemoOwnerDashboardStats } from '@/lib/demo-dashboard';
import { priceFa } from '@/lib/format';

export function OwnerReportsView() {
  const dash = getDemoOwnerDashboardStats();
  const fin = getDemoFinanceStats();

  return (
    <>
      <PageIntro title="گزارش‌ها" description="خلاصه عملکرد و روند رزرو مجموعه." />
      <StatGrid>
        <StatCard label="کل رزروهای پرداخت‌شده" value={fin.paidCount} />
        <StatCard label="در انتظار" value={fin.pendingCount} />
        <StatCard label="درآمد نمایشی" value={priceFa(fin.totalRevenue)} />
        <StatCard label="رزرو امروز" value={dash.todayCount} />
      </StatGrid>
      <DataSection title="یادداشت">
        <p className="subtitle" style={{ margin: 0 }}>
          گزارش‌های تفصیلی (نمودار هفتگی، خروجی Excel) پس از اتصال کامل API در همین بخش قرار
          می‌گیرند. داده‌های فعلی از حالت نمایشی یا API مالک بارگذاری می‌شوند.
        </p>
      </DataSection>
    </>
  );
}
