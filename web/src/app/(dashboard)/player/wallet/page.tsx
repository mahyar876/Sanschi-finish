import type { Metadata } from 'next';
import { PlayerWalletView } from '@/components/views/player/PlayerWalletView';

export const metadata: Metadata = {
  title: 'کیف پول',
  robots: { index: false },
};

export default function PlayerWalletPage() {
  return <PlayerWalletView />;
}
