import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { VenueCard } from '@/components/VenueCard';
import { VENUES } from '@/data/venues';

export default function HomePage() {
  const featured = VENUES.filter((v) => v.featured);
  const also = VENUES.filter((v) => !v.featured).slice(0, 3);

  return (
    <div className="page">
      <section className="hero-home">
        <div>
          <p className="eyebrow">رزرو آنلاین · چمن · فوتسال · والیبال</p>
          <h1>اماکن ورزشی را آنلاین رزرو کنید</h1>
          <p className="lead">
            سانس‌چی به شما کمک می‌کند سالن فوتسال، سالن والیبال یا زمین چمن
            مناسب را پیدا کنید و سانس خالی را در چند مرحله ساده رزرو کنید.
          </p>
          <div className="hero-actions">
            <Button href="/gallery" variant="primary">
              مشاهده زمین‌ها
            </Button>
            <Button href="/reserve" variant="secondary">
              شروع رزرو
            </Button>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/venues/venue-grass-mellat.jpg"
            alt="رزرو چمن فوتبال آنلاین — سانس‌چی"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>
      </section>

      <section className="section">
        <div className="features">
          <div className="feature">
            <h3>سانس شفاف</h3>
            <p>قیمت و زمان هر سانس قبل از تأیید نمایش داده می‌شود.</p>
          </div>
          <div className="feature">
            <h3>چند نوع مجموعه</h3>
            <p>چمن فوتبال، سالن فوتسال، والیبال و سالن‌های چندمنظوره.</p>
          </div>
          <div className="feature">
            <h3>مدیریت برای مالک</h3>
            <p>صاحب مجموعه رزروها و گزارش درآمد را در پنل جداگانه می‌بیند.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>مجموعه‌های پیشنهادی</h2>
            <p>برای رزرو سریع از میان گزینه‌های پرتقاضا شروع کنید</p>
          </div>
          <Link href="/gallery" className="btn btn-ghost btn-sm">
            همه زمین‌ها
          </Link>
        </div>
        <div className="venue-grid">
          {featured.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      </section>

      {also.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>سایر سالن‌ها</h2>
          </div>
          <div className="venue-grid">
            {also.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </section>
      )}

      <section className="penalty-promo" aria-labelledby="penalty-promo-title">
        <p className="eyebrow">مینی‌گیم</p>
        <h2 id="penalty-promo-title">
          پنالتی بزن، <em>جایزه ببر!</em>
        </h2>
        <p>
          با بازی پنالتی سانس‌چی مهارتت را نشان بده — ۵ شوت، سه درجه سختی، و
          شانس دریافت کد تخفیف برای رزرو واقعی.
        </p>
        <div className="penalty-promo-actions">
          <Button href="/penalty" variant="primary">
            ⚽ شروع بازی پنالتی
          </Button>
          <Button href="/reserve" variant="secondary">
            رزرو سانس
          </Button>
        </div>
      </section>
    </div>
  );
}
