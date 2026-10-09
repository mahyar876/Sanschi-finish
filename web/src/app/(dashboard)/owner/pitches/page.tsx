import type { Metadata } from 'next';
import { OwnerPitchesView } from '@/components/views/owner/OwnerPitchesView';

export const metadata: Metadata = {
  title: 'زمین‌های من',
  robots: { index: false },
};

export default function OwnerPitchesPage() {
  return <OwnerPitchesView />;
}
