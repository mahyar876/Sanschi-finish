import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentView } from '@/components/views/PaymentView';

export const metadata: Metadata = {
  title: 'پرداخت رزرو',
  robots: { index: false },
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="page">در حال بارگذاری…</div>}>
      <PaymentView />
    </Suspense>
  );
}
