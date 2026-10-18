import type { Metadata } from 'next';
import { VerifyReservationView } from '@/components/views/VerifyReservationView';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `تأیید رزرو ${decodeURIComponent(code)}`,
    robots: { index: false, follow: false },
  };
}

export default function VerifyReservationPage() {
  return <VerifyReservationView />;
}
