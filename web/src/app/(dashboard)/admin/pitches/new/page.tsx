import type { Metadata } from 'next';
import { AdminNewPitchPage } from '@/components/views/admin/AdminNewPitchPage';

export const metadata: Metadata = {
  title: 'افزودن زمین',
  robots: { index: false },
};

export default function Page() {
  return <AdminNewPitchPage />;
}
