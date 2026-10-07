import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazir',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sanschi.ir';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'سانس‌چی | رزرو آنلاین چمن فوتبال، فوتسال و والیبال',
    template: '%s | سانس‌چی',
  },
  description:
    'رزرو آنلاین زمین چمن فوتبال، سالن فوتسال و سالن والیبال در تهران. مشاهده سانس خالی، قیمت شفاف و رزرو سریع — سانس‌چی.',
  keywords: [
    'رزرو زمین فوتبال',
    'رزرو چمن فوتبال',
    'رزرو سالن فوتسال',
    'رزرو سالن والیبال',
    'رزرو آنلاین ورزشی',
    'سانس فوتسال تهران',
    'زمین چمن تهران',
  ],
  openGraph: {
    locale: 'fa_IR',
    type: 'website',
    title: 'سانس‌چی — رزرو اماکن ورزشی',
    description: 'رزرو آنلاین چمن، فوتسال و والیبال',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazir.variable}>{children}</body>
    </html>
  );
}
