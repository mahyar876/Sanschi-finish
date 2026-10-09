'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageIntro, StatGrid, StatCard } from '@/components/dashboard/DashboardPageBlocks';
import { fetchPitch } from '@/lib/pitch-service';
import { getDemoOwnerPitches } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import type { Pitch } from '@/lib/pitch-types';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';

export function OwnerPitchesView() {
  const { pitches } = useOwnerPitches();
  const [details, setDetails] = useState<Pitch[]>([]);

  useEffect(() => {
    const ids = pitches.map((p) => p._id);
    if (!ids.length) {
      setDetails([]);
      return;
    }
    if (isDemoFrontend()) {
      void Promise.all(ids.map((id) => fetchPitch(id))).then(setDetails).catch(() => setDetails([]));
      return;
    }
    void Promise.all(ids.map((id) => fetchPitch(id)))
      .then(setDetails)
      .catch(() => {
        void Promise.all(getDemoOwnerPitches().map((p) => fetchPitch(p._id))).then(setDetails);
      });
  }, [pitches]);

  const active = details.filter((p) => p.isActive).length;

  return (
    <>
      <PageIntro
        title="مدیریت زمین‌های من"
        description="برای آپلود عکس و ثبت موقعیت روی نقشه، «ویرایش» را بزنید."
      />
      <StatGrid>
        <StatCard label="تعداد زمین" value={details.length || pitches.length} />
        <StatCard label="فعال" value={active} hint={`${details.length - active} غیرفعال`} />
      </StatGrid>
      <div className="pitch-admin-grid">
        {details.map((p) => (
          <article key={p._id} className="pitch-admin-card panel">
            <div className="pitch-admin-card-top">
              <div>
                <h3 className="dash-section-title">{p.name}</h3>
                <p className="muted-sm">{p.address || '—'}</p>
              </div>
              <span className={`badge ${p.isActive ? 'paid' : 'cancelled'}`}>
                {p.isActive ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            <p className="muted-sm">
              قیمت پایه: {priceFa(p.price)} · {p.tags?.length ? p.tags.join('، ') : 'بدون برچسب'}
            </p>
            <div className="pitch-admin-actions">
              <Link href={`/owner/pitch?pitch=${p._id}`} className="btn btn-primary btn-sm">
                ویرایش
              </Link>
              <Link href={`/owner/slots?pitch=${p._id}`} className="btn btn-secondary btn-sm">
                سانس‌ها
              </Link>
            </div>
          </article>
        ))}
        {details.length === 0 && pitches.length === 0 && (
          <p className="notice">مجموعه‌ای یافت نشد.</p>
        )}
      </div>
    </>
  );
}
