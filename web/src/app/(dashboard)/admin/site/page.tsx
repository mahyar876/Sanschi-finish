import type { Metadata } from 'next';
import { AdminSiteSettingsView } from '@/components/views/AdminSiteSettingsView';

export const metadata: Metadata = {
  title: 'تنظیمات صفحهٔ اصلی',
  robots: { index: false },
};

export default function AdminSiteSettingsPage() {
  return <AdminSiteSettingsView />;
}
