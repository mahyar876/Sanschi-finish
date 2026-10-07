import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <strong>سانس‌چی</strong>
          <p className="footer-tagline">
            رزرو آنلاین چمن فوتبال، سالن فوتسال و سالن والیبال
          </p>
        </div>
        <nav className="footer-nav" aria-label="فهرست پاورقی">
          <Link href="/gallery">زمین‌ها و سالن‌ها</Link>
          <Link href="/reserve">رزرو سانس</Link>
          <Link href="/about">درباره ما</Link>
          <Link href="/login">ورود</Link>
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} سانس‌چی — تمامی حقوق محفوظ است.</p>
      </div>
    </footer>
  );
}
