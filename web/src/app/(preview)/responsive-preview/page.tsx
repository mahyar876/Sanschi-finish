import type { Metadata } from 'next';
import { LiveResponsivePreview } from '@/components/LiveResponsivePreview';

export const metadata: Metadata = {
  title: 'پیش‌نمایش زنده رسپانسیو',
  robots: { index: false, follow: false },
};

export default function ResponsivePreviewPage() {
  return <LiveResponsivePreview />;
}
