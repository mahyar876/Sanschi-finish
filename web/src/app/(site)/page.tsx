import { Button } from '@/components/Button';
import { VenueImage } from '@/components/VenueImage';
import { Reveal } from '@/components/Reveal';
import { HomeVenueSections } from '@/components/HomeVenueSections';
import { HomeFlashDealsSection } from '@/components/HomeFlashDealsSection';

export default function HomePage() {
  return (
    <div className="page page-home">
      <section className="hero-home">
        <div className="hero-copy">
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
          <VenueImage
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
          <Reveal delay={0} className="feature-reveal">
            <div className="feature">
              <h3>سانس شفاف</h3>
              <p>قیمت و زمان هر سانس قبل از تأیید نمایش داده می‌شود.</p>
            </div>
          </Reveal>
          <Reveal delay={80} className="feature-reveal">
            <div className="feature">
              <h3>چند نوع مجموعه</h3>
              <p>چمن فوتبال، سالن فوتسال، والیبال و سالن‌های چندمنظوره.</p>
            </div>
          </Reveal>
          <Reveal delay={160} className="feature-reveal">
            <div className="feature">
              <h3>مدیریت برای مالک</h3>
              <p>صاحب مجموعه رزروها و گزارش درآمد را در پنل جداگانه می‌بیند.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <HomeFlashDealsSection />
      <HomeVenueSections />

      <Reveal>
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
      </Reveal>
    </div>
  );
}
