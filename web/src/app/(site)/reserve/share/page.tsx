import { Suspense } from 'react';
import { GroupShareView } from '@/components/views/GroupShareView';

export const metadata = {
  title: 'سهم سانس — اشتراک با گروه',
  description: 'جزئیات تقسیم هزینهٔ سانس برای اعضای تیم',
};

export default function GroupSharePage() {
  return (
    <Suspense
      fallback={
        <div className="page page-narrow">
          <p className="subtitle">در حال بارگذاری…</p>
        </div>
      }
    >
      <GroupShareView />
    </Suspense>
  );
}
