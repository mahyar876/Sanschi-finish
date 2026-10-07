import type { Metadata } from 'next';
import { PenaltyView } from '@/components/views/PenaltyView';

export const metadata: Metadata = {
  title: 'چالش پنالتی',
  description: 'بازی پنالتی سانس‌چی — ۵ شوت، درجه سختی، و شانس کد تخفیف رزرو.',
};

export default function PenaltyPage() {
  return <PenaltyView />;
}
