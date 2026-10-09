import { Suspense } from 'react';
import { ReserveConfirmView } from '@/components/views/ReserveConfirmView';

export default function ReserveConfirmPage() {
  return (
    <Suspense fallback={<div className="page page-narrow"><p className="subtitle">در حال بارگذاری…</p></div>}>
      <ReserveConfirmView />
    </Suspense>
  );
}
