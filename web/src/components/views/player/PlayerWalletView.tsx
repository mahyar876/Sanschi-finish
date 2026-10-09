'use client';

import Link from 'next/link';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';

export function PlayerWalletView() {
  return (
    <>
      <PageIntro
        title="کیف پول / اعتبار"
        description="شارژ اعتبار و پرداخت ترکیبی به‌زودی فعال می‌شود."
      />
      <DataSection title="موجودی">
        <p className="subtitle" style={{ margin: 0 }}>
          موجودی فعلی: <strong>۰ تومان</strong>
        </p>
        <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
          فعلاً پرداخت رزرو از درگاه بانکی در{' '}
          <Link href="/player/reservations">رزروهای من</Link> انجام می‌شود.
        </p>
      </DataSection>
    </>
  );
}
