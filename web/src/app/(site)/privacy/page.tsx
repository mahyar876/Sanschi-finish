import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حریم خصوصی',
  description: 'نحوهٔ نگهداری و استفاده از اطلاعات شخصی در سانس‌چی.',
};

export default function PrivacyPage() {
  return (
    <div className="page page-narrow prose">
      <header className="page-hero">
        <h1>حریم خصوصی</h1>
        <p className="subtitle">ما اطلاعات شما را فقط برای ارائهٔ خدمت رزرو استفاده می‌کنیم.</p>
      </header>
      <h2>داده‌های جمع‌آوری‌شده</h2>
      <p>
        نام، شماره موبایل، سوابق رزرو و پرداخت برای مدیریت حساب و اطلاع‌رسانی
        سانس ذخیره می‌شود.
      </p>
      <h2>نگهداری</h2>
      <p>
        داده‌ها روی سرور امن نگهداری می‌شوند و فقط در محدودهٔ لازم برای عملیات
        رزرو، مالی و پشتیبانی در دسترس تیم مجاز است.
      </p>
      <h2>کوکی و نشست</h2>
      <p>
        برای ورود، توکن احراز هویت در نشست مرورگر (sessionStorage) نگه‌داری
        می‌شود تا تا زمان خروج معتبر بماند.
      </p>
      <h2>درخواست حذف</h2>
      <p>
        برای درخواست حذف یا اصلاح اطلاعات با{' '}
        <a href="mailto:support@sanschii.ir">support@sanschii.ir</a> تماس بگیرید.
      </p>
    </div>
  );
}
