import type { Metadata } from 'next';
import { PenaltyView } from '@/components/views/PenaltyView';

export const metadata: Metadata = {
  title: 'چالش پنالتی',
  robots: { index: false },
};

export default function PenaltyPage() {
  return <PenaltyView />;
}
