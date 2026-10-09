import type { Metadata } from 'next';
import { AdminReservationsPage } from '@/components/views/admin/AdminReservationsPage';

export const metadata: Metadata = {
  title: 'رزروها',
  robots: { index: false },
};

export default function Page() {
  return <AdminReservationsPage />;
}
