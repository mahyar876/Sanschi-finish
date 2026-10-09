'use client';

import Link from 'next/link';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';

export function PlayerPlaceholderView({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <>
      <PageIntro title={title} description={description} />
      <DataSection title="وضعیت">
        <p className="subtitle" style={{ margin: 0 }}>
          این بخش در نسخه فعلی با داده نمایشی و اتصال تدریجی API آماده شده است. امکانات اصلی
          رزرو و پرداخت از طریق{' '}
          <Link href="/reserve">صفحه رزرو</Link> در دسترس است.
        </p>
        {actionHref && actionLabel && (
          <Link href={actionHref} className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
            {actionLabel}
          </Link>
        )}
      </DataSection>
    </>
  );
}
