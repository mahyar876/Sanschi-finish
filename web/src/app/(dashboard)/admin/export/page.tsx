import type { Metadata } from 'next';
import { AdminExportPage } from '@/components/views/admin/AdminExportPage';

export const metadata: Metadata = {
  title: 'خروجی داده',
  robots: { index: false },
};

export default function Page() {
  return <AdminExportPage />;
}
