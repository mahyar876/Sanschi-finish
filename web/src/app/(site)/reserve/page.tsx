import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReserveView } from '@/components/views/ReserveView';

export const metadata: Metadata = {
  title: 'رزرو سانس',
  description: 'رزرو آنلاین زمین چمن، سالن فوتسال و والیبال',
};

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="page">در حال بارگذاری…</div>}>
      <ReserveView />
    </Suspense>
  );
}
