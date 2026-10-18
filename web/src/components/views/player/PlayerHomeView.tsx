'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { getDemoMyReservations } from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { PartnerApplicationStatusBanner } from '@/components/PartnerApplicationStatusBanner';
import { getUser } from '@/lib/session';
import { apiFetch } from '@/lib/fetch-api';
import { fetchWalletBalance } from '@/lib/wallet';
import { priceFa } from '@/lib/format';

export function PlayerHomeView() {
  const [upcoming, setUpcoming] = useState(0);
  const [pending, setPending] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const user = getUser();

  useEffect(() => {
    if (isDemoFrontend()) {
      const r = getDemoMyReservations().filter((x) => x.status !== 'cancelled');
      setUpcoming(r.length);
      setPending(r.filter((x) => x.status === 'pending').length);
      return;
    }
    void apiFetch<{ success: boolean; reservations: { status: string }[] }>('/reservations/my')
      .then((d) => {
        if (!d.success) return;
        const active = d.reservations.filter((x) => x.status !== 'cancelled');
        setUpcoming(active.length);
        setPending(active.filter((x) => x.status === 'pending').length);
      })
      .catch(() => {
        const r = getDemoMyReservations().filter((x) => x.status !== 'cancelled');
        setUpcoming(r.length);
        setPending(r.filter((x) => x.status === 'pending').length);
      });
  }, []);

  useEffect(() => {
    void fetchWalletBalance()
      .then(setWalletBalance)
      .catch(() => setWalletBalance(0));
  }, []);

  return (
    <>
      <PageIntro
        title={`سلام ${user?.name || 'بازیکن'}`}
        description="رزرو زمین، پیگیری پرداخت و مدیریت رزروهای خود را از اینجا انجام دهید."
      />
      <PartnerApplicationStatusBanner user={user} />
      {pending > 0 && (
        <div className="panel dash-alert" role="status">
          {pending} رزرو در انتظار پرداخت دارید.{' '}
          <Link href="/player/reservations">مشاهده و پرداخت</Link>
        </div>
      )}
      <StatGrid>
        <StatCard label="رزروهای فعال" value={upcoming} />
        <StatCard label="در انتظار پرداخت" value={pending} />
        <StatCard
          label="اعتبار کیف پول"
          value={
            walletBalance === null
              ? '…'
              : `${priceFa(walletBalance)} تومان`
          }
          hint={walletBalance !== null ? 'شارژ از بخش کیف پول' : undefined}
        />
        <StatCard label="تخفیف فعال" value="—" hint="بخش تخفیف‌ها" />
      </StatGrid>
      <ActionsPanel title="شروع سریع">
        <div className="dash-shortcuts">
          <Link href="/gallery" className="btn btn-primary">
            جستجوی زمین
          </Link>
          <Link href="/player/reservations" className="btn btn-secondary">
            رزروهای من
          </Link>
          <Link href="/player/rebook" className="btn btn-secondary">
            رزرو مجدد
          </Link>
          <Link href="/reserve" className="btn btn-ghost">
            رزرو مستقیم
          </Link>
        </div>
      </ActionsPanel>
    </>
  );
}
