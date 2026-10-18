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
          در حالت development پرداخت واقعی هم بدون زرین‌پال انجام می‌شود — برای تست کامل
          جریان رزرو + پنل بازیکن.
        </p>
      </header>
      <div className="panel">
        <h2 className="h6" style={{ marginTop: 0 }}>
          مسیر پیشنهادی (رزرو واقعی روی Mongo)
        </h2>
        <ol className="muted-sm" style={{ margin: 0, paddingRight: '1.25rem', lineHeight: 1.75 }}>
          <li>backend روی پورت ۵۰۰۰ و web روی ۳۰۰۰</li>
          <li>
            در <code>backend/.env</code> مقدار <code>ALLOW_MOCK_PAY=true</code> (پیش‌فرض example)
          </li>
          <li>ورود / ثبت‌نام → رزرو سانس → صفحه پرداخت</li>
          <li>
            دکمه <strong>«پرداخت آزمایشی (بدون درگاه)»</strong> — رزرو paid می‌شود و در پنل
            بازیکن دیده می‌شود
          </li>
        </ol>
        <h2 className="h6" style={{ marginTop: '1.25rem' }}>
          فقط UI (بدون رزرو در دیتابیس)
        </h2>
        <ul className="muted-sm" style={{ margin: 0, paddingRight: '1.1rem', lineHeight: 1.7 }}>
          <li>مبلغ نمونه: ۵۲۰٬۰۰۰ تومان</li>
          <li>کد تخفیف و چک‌لیست تیم روی همین صفحه</li>
        </ul>
        <div className="hero-actions" style={{ marginTop: '1.25rem' }}>
          <Link href="/reserve" className="btn btn-primary">
            شروع رزرو واقعی (تست)
          </Link>
          <Link href={`/payment?${TEST_QUERY}`} className="btn btn-secondary">
            UI mock بدون Mongo
          </Link>
        </div>
      </div>
    </div>
  );
}
