import type { Metadata } from 'next';
import { Button } from '@/components/Button';
import { VenueImage } from '@/components/VenueImage';
import { Reveal } from '@/components/Reveal';
import { HomeVenueSections } from '@/components/HomeVenueSections';
import { HomeFlashDealsSection } from '@/components/HomeFlashDealsSection';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanschii.ir';

export const metadata: Metadata = {
  title: 'رزرو آنلاین چمن فوتبال، سالن فوتسال و والیبال در تهران',
  description:
    'رزرو زمین چمن فوتبال (مصنوعی و طبیعی)، سالن فوتسال سرپوشیده و سالن والیبال در تهران. مشاهده سانس خالی، قیمت شفاف، تخفیف لحظه‌آخر و پرداخت آنلاین — سانس‌چی.',
  keywords: [
    'رزرو زمین فوتبال',
    'رزرو چمن فوتبال',
    'رزرو چمن مصنوعی',
    'رزرو سالن فوتسال',
    'رزرو سالن والیبال',
    'رزرو آنلاین ورزشی تهران',
    'سانس فوتسال تهران',
    'زمین چمن تهران',
    'رزرو سانس ورزشی',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'سانس‌چی | رزرو آنلاین چمن، فوتسال و والیبال در تهران',
    description:
      'رزرو زمین چمن و سالن فوتسال و والیبال — سانس خالی، قیمت شفاف، رزرو سریع.',
    url: siteUrl,
    locale: 'fa_IR',
    type: 'website',
  },
};

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'سانس‌چی',
      url: siteUrl,
      logo: `${siteUrl}/venues/venue-grass-mellat.jpg`,
      description:
        'پلتفرم رزرو آنلاین زمین چمن فوتبال، سالن فوتسال و سالن والیبال در تهران.',
    },
    {
      '@type': 'WebSite',
      name: 'سانس‌چی',
      url: siteUrl,
      inLanguage: 'fa-IR',
      description: 'رزرو آنلاین اماکن ورزشی — چمن، فوتسال، والیبال',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/reserve`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <div className="page page-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      <section className="hero-home" aria-label="معرفی سانس‌چی">
        <div className="hero-home-inner">
          <div className="hero-copy">
            <p className="eyebrow hero-home-eyebrow">رزرو آنلاین · چمن · فوتسال · والیبال</p>
            <h1 className="hero-home-title">
              اماکن ورزشی را{' '}
              <span className="hero-home-highlight">آنلاین</span> رزرو کنید
            </h1>
            <p className="lead hero-home-lead">
              سانس‌چی به شما کمک می‌کند سالن فوتسال، سالن والیبال یا زمین چمن
              مناسب را پیدا کنید و سانس خالی را در چند مرحله ساده رزرو کنید.
            </p>
            <div className="hero-actions hero-home-actions">
              <Button href="/assistant" variant="primary">
                دستیار هوشمند
              </Button>
              <Button href="/penalty" variant="secondary">
                ⚽ بازی پنالتی
              </Button>
            </div>
            <ul className="hero-home-meta" aria-label="مزایا">
              <li className="hero-home-meta-feature">سانس لحظه‌آخر</li>
              <li>قیمت شفاف</li>
              <li>مجموعه‌های تهران</li>
            </ul>
          </div>
          <div className="hero-visual hero-home-photo">
            <VenueImage
              src="/venues/venue-grass-football-hero.jpg"
              alt="زمین چمن فوتبال میان کوه — سانس‌چی"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
        </div>
      </section>

      <HomeFlashDealsSection />
      <HomeVenueSections />

      <section className="section section-features">
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

      <section className="section">
        <Reveal>
          <div className="penalty-promo" aria-labelledby="penalty-promo-title">
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
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
