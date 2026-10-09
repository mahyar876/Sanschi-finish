import type { Metadata } from 'next';
import { OwnerReservationsView } from '@/components/views/owner/OwnerReservationsView';

export const metadata: Metadata = {
  title: 'رزروها — مالک',
  robots: { index: false },
};

export default function OwnerReservationsPage() {
  return <OwnerReservationsView />;
}
