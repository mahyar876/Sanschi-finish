import type { Metadata } from 'next';
import { OwnerView } from '@/components/views/OwnerView';

export const metadata: Metadata = {
  title: 'پنل مالک',
  robots: { index: false },
};

export default function OwnerPage() {
  return <OwnerView />;
}
