import type { Metadata } from 'next';
import { PlayerRebookView } from '@/components/views/player/PlayerRebookView';

export const metadata: Metadata = {
  title: 'رزرو مجدد',
  robots: { index: false },
};

export default function PlayerRebookPage() {
  return <PlayerRebookView />;
}
