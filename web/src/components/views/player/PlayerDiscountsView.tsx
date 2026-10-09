'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { listLocalDiscounts, type StoredDiscount } from '@/lib/local-discounts';
import { numFa } from '@/lib/jalali';
import { isDemoFrontend } from '@/lib/demo';

function formatExp(exp: number) {
  return new Date(exp).toLocaleDateString('fa-IR');
}

export function PlayerDiscountsView() {
  const [rows, setRows] = useState<StoredDiscount[]>([]);

  useEffect(() => {
    setRows(listLocalDiscounts());
  }, []);

  return (
    <>
      <PageIntro
        title="تخفیف‌ها"
        description="کدهای ذخیره‌شده (مثلاً از بازی پنالتی) — در صفحه پرداخت قابل استفاده هستند."
      />
      <DataSection title="کدهای من">
        {rows.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            هنوز کدی ندارید. با{' '}
            <Link href="/penalty">بازی پنالتی</Link> یا پروموهای آینده کد
            دریافت کنید.
            {isDemoFrontend() && ' در حالت نمایشی کدها در مرورگر ذخیره می‌شوند.'}
          </p>
        ) : (
          <ul className="res-card-list">
            {rows.map((r) => (
              <li key={r.code} className="panel">
                <strong>{r.code}</strong>
                <span className="muted-sm">
                  {' '}
                  · {numFa(r.pct)}٪
                  {r.maxAmount ? ` · سقف ${numFa(r.maxAmount)} تومان` : ''}
                  {' · '}
                  {r.used ? 'استفاده‌شده' : 'فعال'}
                  {' · انقضا '}
                  {formatExp(r.exp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DataSection>
    </>
  );
}
