import type { Metadata } from 'next';
import { PlayerNotificationsView } from '@/components/views/player/PlayerNotificationsView';

export const metadata: Metadata = {
  title: 'اعلان‌ها',
  robots: { index: false },
};

export default function PlayerNotificationsPage() {
  return <PlayerNotificationsView />;
}
