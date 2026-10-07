import type { Metadata } from 'next';
import { AdminView } from '@/components/views/AdminView';

export const metadata: Metadata = {
  title: 'مدیریت',
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminView />;
}
