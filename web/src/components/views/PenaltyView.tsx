import { Button } from '@/components/Button';

export function PenaltyView() {
  return (
    <div className="page page-narrow">
      <header className="page-hero">
        <p className="eyebrow">سرگرمی</p>
        <h1>چالش پنالتی</h1>
        <p className="subtitle">
          نسخهٔ جدید با طراحی ساده‌تر به‌زودی اضافه می‌شود. تمرکز فعلی روی
          تجربهٔ رزرو و پنل‌هاست.
        </p>
      </header>
      <div className="panel">
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          در فاز بعد می‌توانید با تکمیل پروفایل در قرعهٔ جوایز رزرو شرکت کنید.
        </p>
      </div>
      <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
        <Button href="/reserve" variant="primary">
          رزرو سانس
        </Button>
        <Button href="/gallery" variant="secondary">
          زمین‌ها
        </Button>
      </div>
    </div>
  );
}
