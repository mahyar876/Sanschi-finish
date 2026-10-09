import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'پرداخت آزمایشی',
  robots: { index: false, follow: false },
};

const TEST_QUERY = new URLSearchParams({
  reservationId: 'mock-test',
  pitchId: 'demo-1',
  pitchName: 'رزرو آزمایشی سانس‌چی',
  date: '1404/07/17',
  time: '۱۸:۰۰–۱۹:۳۰',
  name: 'کاربر تست',
  phone: '09120000000',
  amount: '520000',
}).toString();

export default function PaymentTestPage() {
  return (
    <div className="page page-narrow">
      <header className="page-hero">
        <p className="eyebrow">فقط تست</p>
        <h1>پرداخت آزمایشی</h1>
        <p className="subtitle">
          بدون رزرو واقعی — برای امتحان درگاه mock، کد تخفیف و UI پرداخت.
        </p>
      </header>
      <div className="panel">
        <ul className="muted-sm" style={{ margin: 0, paddingRight: '1.1rem', lineHeight: 1.7 }}>
          <li>مبلغ نمونه: ۵۲۰٬۰۰۰ تومان</li>
          <li>کدهای ادمین (مثل STORY20) یا کد پنالتی در همان صفحه قابل تست است</li>
          <li>دکمه «پرداخت آزمایشی» رزرو را شبیه‌سازی می‌کند</li>
        </ul>
        <div className="hero-actions" style={{ marginTop: '1.25rem' }}>
          <Link href={`/payment?${TEST_QUERY}`} className="btn btn-primary">
            ورود به صفحه پرداخت mock
          </Link>
          <Link href="/reserve" className="btn btn-secondary">
            رزرو واقعی
          </Link>
        </div>
      </div>
    </div>
  );
}
