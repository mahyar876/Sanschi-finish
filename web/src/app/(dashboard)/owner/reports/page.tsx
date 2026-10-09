import type { Metadata } from 'next';
import { OwnerReportsView } from '@/components/views/owner/OwnerReportsView';

export const metadata: Metadata = {
  title: 'گزارش‌ها',
  robots: { index: false },
};

export default function OwnerReportsPage() {
  return <OwnerReportsView />;
}
