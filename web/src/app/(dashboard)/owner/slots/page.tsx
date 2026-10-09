import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerSlotsView } from '@/components/views/owner/OwnerSlotsView';

export const metadata: Metadata = {
  title: 'مدیریت سانس‌ها',
  robots: { index: false },
};

export default function OwnerSlotsPage() {
  return (
    <Suspense fallback={<p className="subtitle">در حال بارگذاری…</p>}>
      <OwnerSlotsView />
    </Suspense>
  );
}
