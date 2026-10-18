'use client';

import { useMemo, useState } from 'react';
import { DataSection, ListToolbar, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { getDemoOwnerCustomers } from '@/lib/demo-dashboard';
import { priceFa } from '@/lib/format';

export function OwnerCustomersView() {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => getDemoOwnerCustomers(), []);

  const filtered = rows.filter((r) => {
    const q = search.trim();
    if (!q) return true;
    return `${r.name} ${r.phone}`.includes(q);
  });

  return (
    <>
      <PageIntro title="مشتریان" description="لیست بازیکنانی که از مجموعه شما رزرو کرده‌اند." />
      <DataSection
        title="مشتریان"
        toolbar={
          <ListToolbar
            className="owner-filter-bar"
            searchPlaceholder="جستجو نام یا موبایل…"
            searchValue={search}
            onSearchChange={setSearch}
          />
        }
      >
        <div className="data-table-wrap owner-card-table-wrap">
          <table className="data-table owner-card-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>موبایل</th>
                <th>تعداد رزرو</th>
                <th>مجموع پرداخت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.name}>
                  <td data-label="نام">{r.name}</td>
                  <td data-label="موبایل">{r.phone}</td>
                  <td data-label="تعداد رزرو">{r.count}</td>
                  <td data-label="مجموع پرداخت">{priceFa(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
