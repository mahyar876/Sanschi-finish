'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoMyReservations } from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';

type Row = {
  _id: string;
  pitch?: { _id?: string; name: string };
  date: string;
  slotTime: string;
};

export function PlayerRebookView() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (isDemoFrontend()) {
      setRows(getDemoMyReservations());
      return;
    }
    void apiFetch<{ success: boolean; reservations: Row[] }>('/reservations/my').then(
      (d) => {
        if (d.success) setRows(d.reservations.slice(0, 10));
      },
    );
  }, []);

  return (
    <>
      <PageIntro
        title="رزرو مجدد"
        description="از رزروهای قبلی همان مجموعه را دوباره انتخاب کنید."
      />
      <DataSection title="رزروهای اخیر">
        <ul className="res-card-list">
          {rows.length === 0 && (
            <p className="notice">
              رزروی نیست — <Link href="/player/search">جستجوی زمین</Link>
            </p>
          )}
          {rows.map((r) => (
            <li key={r._id} className="res-card panel">
              <h3 className="dash-section-title">{r.pitch?.name || 'مجموعه'}</h3>
              <p className="muted-sm">
                {r.date} · {r.slotTime}
              </p>
              <Link
                href={`/reserve?pitchId=${encodeURIComponent(r.pitch?._id || '')}`}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '0.75rem' }}
              >
                رزرو مجدد
              </Link>
            </li>
          ))}
        </ul>
      </DataSection>
    </>
  );
}
