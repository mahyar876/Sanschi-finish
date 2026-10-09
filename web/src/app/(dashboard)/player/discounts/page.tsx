import type { Metadata } from 'next';
import { PlayerDiscountsView } from '@/components/views/player/PlayerDiscountsView';

export const metadata: Metadata = {
  title: 'تخفیف‌ها',
  robots: { index: false },
};

export default function PlayerDiscountsPage() {
  return <PlayerDiscountsView />;
}
