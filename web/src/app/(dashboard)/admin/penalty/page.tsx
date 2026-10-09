import type { Metadata } from 'next';
import { AdminPenaltyView } from '@/components/views/AdminPenaltyView';

export const metadata: Metadata = {
  title: 'تنظیمات پنالتی',
  robots: { index: false },
};

export default function AdminPenaltyPage() {
  return <AdminPenaltyView />;
}
