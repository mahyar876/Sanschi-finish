import type { Metadata } from 'next';
import { OwnerCustomersView } from '@/components/views/owner/OwnerCustomersView';

export const metadata: Metadata = {
  title: 'مشتریان',
  robots: { index: false },
};

export default function OwnerCustomersPage() {
  return <OwnerCustomersView />;
}
