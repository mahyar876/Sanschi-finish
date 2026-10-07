import type { Metadata } from 'next';
import { Button } from '@/components/Button';

export const metadata: Metadata = {
  title: 'درباره سانس‌چی',
  description:
    'سانس‌چی پلتفرم رزرو آنلاین اماکن ورزشی است: چمن فوتبال، سالن فوتسال و والیبال.',
};

export default function AboutPage() {
  return (
    <div className="page page-narrow prose">
      <header className="page-hero">
        <p className="eyebrow">درباره ما</p>
        <h1>سانس‌چی چیست؟</h1>
        <p className="subtitle">
          ما رزرو آنلاین اماکن ورزشی را ساده‌تر می‌کنیم — برای بازیکن، تیم و
          صاحب مجموعه.
        </p>
      </header>

      <h2>برای بازیکنان</h2>
      <p>
        می‌توانید بدون تماس تلفنی، سانس خالی چمن فوتبال، سالن فوتسال یا
        والیبال را ببینید و رزرو کنید. جزئیات زمان، مکان و مبلغ قبل از
        پرداخت مشخص است.
      </p>

      <h2>برای صاحبان مجموعه</h2>
      <p>
        پنل جداگانه برای مشاهده رزروها، وضعیت پرداخت و خلاصه درآمد (شامل
        سهم مجموعه و در آینده کارمزد پلتفرم) در نظر گرفته شده است.
      </p>

      <h2>مسیر توسعه</h2>
      <p>
        در حال حاضر روی چمن فوتبال، فوتسال و والیبال تمرکز داریم. هدف بلندمدت
        پوشش انواع اماکن ورزشی در شهرهای مختلف است.
      </p>

      <div className="hero-actions" style={{ marginTop: '2rem' }}>
        <Button href="/gallery" variant="primary">
          دیدن زمین‌ها
        </Button>
        <Button href="/reserve" variant="secondary">
          رزرو سانس
        </Button>
      </div>
    </div>
  );
}
