import type { Metadata } from 'next';
import { OwnerDashboardView } from '@/components/views/owner/OwnerDashboardView';

export const metadata: Metadata = {
  title: 'داشبورد مالک',
  robots: { index: false },
};

export default function OwnerPage() {
  return <OwnerDashboardView />;
}
