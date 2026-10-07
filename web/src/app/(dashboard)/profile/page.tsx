import type { Metadata } from 'next';
import { ProfileView } from '@/components/views/ProfileView';

export const metadata: Metadata = {
  title: 'پروفایل',
  robots: { index: false },
};

export default function ProfilePage() {
  return <ProfileView />;
}
