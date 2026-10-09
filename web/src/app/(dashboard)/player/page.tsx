import type { Metadata } from 'next';
import { PlayerHomeView } from '@/components/views/player/PlayerHomeView';

export const metadata: Metadata = {
  title: 'پنل بازیکن',
  robots: { index: false },
};

export default function PlayerHomePage() {
  return <PlayerHomeView />;
}
