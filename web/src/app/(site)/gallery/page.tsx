import type { Metadata } from 'next';
import { GalleryGrid } from '@/components/GalleryGrid';

export const metadata: Metadata = {
  title: 'گالری زمین‌ها — رزرو چمن، فوتسال و والیبال',
  description:
    'لیست سالن فوتسال، سالن والیبال و زمین چمن فوتبال قابل رزرو در سانس‌چی. فیلتر بر اساس نوع، قیمت و سانس خالی.',
  keywords: [
    'لیست زمین فوتبال',
    'سالن والیبال تهران',
    'چمن مصنوعی',
    'رزرو سالن فوتسال',
  ],
};

export default function GalleryPage() {
  return (
    <div className="page">
      <header className="page-hero">
        <p className="eyebrow">گالری مجموعه‌ها</p>
        <h1>زمین و سالن مناسب خود را انتخاب کنید</h1>
        <p className="subtitle">
          فوتسال سرپوشیده، سالن والیبال، چمن مصنوعی و طبیعی — با امکان
          فیلتر و مرتب‌سازی برای پیدا کردن بهترین سانس.
        </p>
      </header>
      <GalleryGrid />
    </div>
  );
}
