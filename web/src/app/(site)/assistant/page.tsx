import type { Metadata } from 'next';
import { BookingAssistantView } from '@/components/views/BookingAssistantView';

export const metadata: Metadata = {
  title: 'دستیار هوشمند رزرو — سانس‌چی',
  description:
    'روز و ساعت بازی را بگویید؛ سانس‌چی مجموعه و سانس آزاد پیشنهاد می‌دهد.',
};

export default function AssistantPage() {
  return <BookingAssistantView />;
}
