import Link from 'next/link';
import { Button } from '@/components/Button';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>سانس‌چی</strong>
          <p className="footer-tagline">
            رزرو آنلاین چمن فوتبال، سالن فوتسال و سالن والیبال — سانس شفاف، قیمت
            روشن، رزرو سریع.
          </p>
        </div>
        <nav className="footer-nav" aria-label="فهرست پاورقی">
          <p className="footer-nav-title">دسترسی سریع</p>
          <Link href="/gallery">زمین‌ها و سالن‌ها</Link>
          <Link href="/reserve">رزرو سانس</Link>
          <Link href="/penalty">بازی پنالتی</Link>
          <Link href="/about">درباره ما</Link>
          <Link href="/login">ورود</Link>
        </nav>
        <div className="footer-cta-block">
          <p className="footer-cta-text">همین الان سانس خالی را رزرو کن</p>
          <Button href="/reserve" variant="primary">
            رزرو سانس
          </Button>
          <Button href="/penalty" variant="secondary">
            ⚽ بازی پنالتی
          </Button>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} سانس‌چی — تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}
