import type { Metadata } from 'next';
import { AdminOwnersPage } from '@/components/views/admin/AdminOwnersPage';

export const metadata: Metadata = {
  title: 'مالکیت زمین‌ها',
  robots: { index: false },
};

export default function Page() {
  return <AdminOwnersPage />;
}
