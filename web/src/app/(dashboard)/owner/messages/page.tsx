import type { Metadata } from 'next';
import { OwnerMessagesView } from '@/components/views/owner/OwnerMessagesView';

export const metadata: Metadata = {
  title: 'پیام‌ها',
  robots: { index: false },
};

export default function OwnerMessagesPage() {
  return <OwnerMessagesView />;
}
