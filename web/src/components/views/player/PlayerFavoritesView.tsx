'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { VenueCard } from '@/components/VenueCard';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { loadFavoritePitchIds } from '@/lib/favorites';

export function PlayerFavoritesView() {
  const [venues, setVenues] = useState<CatalogVenue[]>([]);

  useEffect(() => {
    const ids = new Set(loadFavoritePitchIds());
    void fetchCatalog().then(({ items }) => {
      setVenues(items.filter((v) => ids.has(v.pitchId)));
    });
  }, []);

  return (
    <>
      <PageIntro
        title="علاقه‌مندی‌ها"
        description="مجموعه‌هایی که با ستاره در صفحه جزئیات ذخیره کرده‌اید."
      />
      <DataSection title="لیست">
        {venues.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            موردی نیست. از{' '}
            <Link href="/gallery">گالری زمین‌ها</Link> وارد صفحه هر مجموعه شوید
            و «افزودن به علاقه‌مندی» را بزنید.
          </p>
        ) : (
          <div className="venue-grid">
            {venues.map((v) => (
              <VenueCard key={v.pitchId} venue={v} />
            ))}
          </div>
        )}
      </DataSection>
    </>
  );
}
