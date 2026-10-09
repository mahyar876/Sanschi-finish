import type { Metadata } from 'next';
import { MobilePreviewGallery } from '@/components/MobilePreviewGallery';

export const metadata: Metadata = {
  title: 'پیش‌نمایش موبایل',
  robots: { index: false, follow: false },
};

export default function MobilePreviewPage() {
  return <MobilePreviewGallery />;
}
