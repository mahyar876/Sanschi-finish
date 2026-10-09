import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerPitchView } from '@/components/views/OwnerPitchView';

export const metadata: Metadata = {
  title: 'ویرایش مجموعه',
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={<p className="subtitle">در حال بارگذاری…</p>}>
      <OwnerPitchView />
    </Suspense>
  );
}
