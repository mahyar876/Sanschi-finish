'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/components/Reveal';
import { VenueCard } from '@/components/VenueCard';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';

export function HomeVenueSections() {
  const [items, setItems] = useState<CatalogVenue[]>([]);

  useEffect(() => {
    void fetchCatalog().then(({ items: list }) => setItems(list));
  }, []);

  const featured = [
    ...items.filter((v) => v.featured),
    ...items.filter((v) => !v.featured),
  ].slice(0, 3);
  const featuredIds = new Set(featured.map((v) => v.pitchId));
  const also = items.filter((v) => !featuredIds.has(v.pitchId)).slice(0, 3);

  if (!items.length) return null;

  return (
    <>
      <section className="section">
        <Reveal>
          <div className="section-head">
            <div>
              <h2>مجموعه‌های پیشنهادی</h2>
              <p>برای رزرو سریع از میان گزینه‌های پرتقاضا شروع کنید</p>
            </div>
            <Link href="/gallery" className="btn btn-ghost btn-sm">
              همه زمین‌ها
            </Link>
          </div>
        </Reveal>
        <div className="venue-grid venue-grid-balanced">
          {featured.map((v, i) => (
            <VenueCard key={v.pitchId} venue={v} stagger={i * 70} />
          ))}
        </div>
      </section>

      {also.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>سایر سالن‌ها</h2>
          </div>
          <div className="venue-grid">
            {also.map((v, i) => (
              <VenueCard key={v.pitchId} venue={v} stagger={i * 70} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
