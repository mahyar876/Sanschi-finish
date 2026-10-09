import type { Metadata } from 'next';
import { AdminOverviewPage } from '@/components/views/admin/AdminOverviewPage';

export const metadata: Metadata = {
  title: 'داشبورد مدیریت',
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminOverviewPage />;
}
