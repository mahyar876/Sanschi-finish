import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginView } from '@/components/views/LoginView';

export const metadata: Metadata = {
  title: 'ورود و ثبت‌نام',
  description: 'ورود به سانس‌چی برای رزرو چمن فوتبال، فوتسال و والیبال',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page">در حال بارگذاری…</div>}>
      <LoginView />
    </Suspense>
  );
}
