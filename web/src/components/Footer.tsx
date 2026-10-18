import Link from 'next/link';
import { Button } from '@/components/Button';

const quickLinks = [
  { href: '/gallery', label: 'زمین‌ها و سالن‌ها' },
  { href: '/reserve', label: 'رزرو سانس' },
  { href: '/penalty', label: 'بازی پنالتی' },
  { href: '/about', label: 'درباره ما' },
  { href: '/for-owners', label: 'ثبت مجموعه' },
  { href: '/login', label: 'ورود / ثبت‌نام' },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <strong className="logo-wordmark">سانس‌چی</strong>
            </div>
            <p className="footer-tagline">
              پلتفرم رزرو آنلاین چمن فوتبال، سالن فوتسال و والیبال — سانس شفاف،
              قیمت روشن، رزرو در چند کلیک.
            </p>
            <ul className="footer-trust" aria-label="مزایا">
              <li>سانس و قیمت شفاف</li>
              <li>رزرو سریع</li>
              <li>چند نوع مجموعه</li>
            </ul>
            <p className="footer-contact muted-sm">
              پشتیبانی:{' '}
              <a href="mailto:support@sanschii.ir">support@sanschii.ir</a>
              {' · '}
              <a href="tel:+982100000000">۰۲۱-۰۰۰۰۰۰۰۰</a>
            </p>
          </div>

          <nav className="footer-nav" aria-label="فهرست پاورقی">
            <p className="footer-nav-title">دسترسی سریع</p>
            <ul className="footer-link-list">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-cta-block">
            <p className="footer-cta-title">آمادهٔ بازی هستی؟</p>
            <p className="footer-cta-text">همین الان سانس خالی را انتخاب و رزرو کن.</p>
            <div className="footer-cta-actions">
              <Button href="/reserve" variant="primary" className="btn-sm">
                رزرو سانس
              </Button>
              <Button href="/penalty" variant="secondary" className="btn-sm">
                ⚽ پنالتی
              </Button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} سانس‌چی — تمامی حقوق محفوظ است.
          </p>
          <div className="footer-bottom-links">
            <Link href="/terms">قوانین استفاده</Link>
            <Link href="/privacy">حریم خصوصی</Link>
            <Link href="/about">تماس و درباره</Link>
            <Link href="/gallery">همه زمین‌ها</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
