import type { Metadata } from 'next';
import { OwnerPartnerView } from '@/components/views/OwnerPartnerView';

export const metadata: Metadata = {
  title: 'ثبت زمین — همکاری با سانس‌چی',
  description:
    'زمین فوتسال یا سالن خود را در سانس‌چی ثبت کنید. پس از تأیید مدیر، به پنل مالک دسترسی می‌گیرید.',
};

export default function ForOwnersPage() {
  return <OwnerPartnerView />;
}
