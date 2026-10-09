import type { Metadata } from 'next';
import { PlayerProfileView } from '@/components/views/player/PlayerProfileView';

export const metadata: Metadata = {
  title: 'پروفایل',
  robots: { index: false },
};

export default function PlayerProfilePage() {
  return <PlayerProfileView />;
}
