import type { Metadata } from 'next';
import { AdminFinanceView } from '@/components/views/AdminFinanceView';

export const metadata: Metadata = {
  title: 'مالی کل',
  robots: { index: false },
};

export default function AdminFinancePage() {
  return <AdminFinanceView />;
}
