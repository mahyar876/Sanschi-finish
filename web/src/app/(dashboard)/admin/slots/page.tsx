import type { Metadata } from 'next';
import { AdminSlotsPage } from '@/components/views/admin/AdminSlotsPage';

export const metadata: Metadata = {
  title: 'سانس و قیمت',
  robots: { index: false },
};

export default function Page() {
  return <AdminSlotsPage />;
}
