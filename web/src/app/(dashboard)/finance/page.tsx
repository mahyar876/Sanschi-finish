import type { Metadata } from 'next';
import { FinanceView } from '@/components/views/FinanceView';

export const metadata: Metadata = {
  title: 'گزارش مالی',
  robots: { index: false },
};

export default function FinancePage() {
  return <FinanceView />;
}
