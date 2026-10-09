import type { Metadata } from 'next';
import { AdminPitchesPage } from '@/components/views/admin/AdminPitchesPage';

export const metadata: Metadata = {
  title: 'مدیریت زمین‌ها',
  robots: { index: false },
};

export default function Page() {
  return <AdminPitchesPage />;
}
