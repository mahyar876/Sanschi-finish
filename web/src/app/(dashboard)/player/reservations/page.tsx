import type { Metadata } from 'next';
import { PlayerReservationsView } from '@/components/views/player/PlayerReservationsView';

export const metadata: Metadata = {
  title: 'رزروهای من',
  robots: { index: false },
};

export default function PlayerReservationsPage() {
  return <PlayerReservationsView />;
}
