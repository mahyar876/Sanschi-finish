import type { Metadata } from 'next';
import { SettlementView } from '@/components/views/SettlementView';

export const metadata: Metadata = {
  title: 'تسویه',
  robots: { index: false },
};

export default function SettlementPage() {
  return <SettlementView />;
}
