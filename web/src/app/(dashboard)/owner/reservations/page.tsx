import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerReservationsView } from '@/components/views/owner/OwnerReservationsView';

export const metadata: Metadata = {
  title: 'رزروها — مالک',
  robots: { index: false },
};

export default function OwnerReservationsPage() {
  return (
    <Suspense fallback={<p className="muted-sm">در حال بارگذاری…</p>}>
      <OwnerReservationsView />
    </Suspense>
  );
}
