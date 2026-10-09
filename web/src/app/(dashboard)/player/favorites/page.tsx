import type { Metadata } from 'next';
import { PlayerFavoritesView } from '@/components/views/player/PlayerFavoritesView';

export const metadata: Metadata = {
  title: 'علاقه‌مندی‌ها',
  robots: { index: false },
};

export default function PlayerFavoritesPage() {
  return <PlayerFavoritesView />;
}
