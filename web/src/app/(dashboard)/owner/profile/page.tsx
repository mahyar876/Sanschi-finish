import type { Metadata } from 'next';
import { PlayerProfileView } from '@/components/views/player/PlayerProfileView';

export const metadata: Metadata = {
  title: 'پروفایل مالک',
  robots: { index: false },
};

export default function OwnerProfilePage() {
  return <PlayerProfileView />;
}
