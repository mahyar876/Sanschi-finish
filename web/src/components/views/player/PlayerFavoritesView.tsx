'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { VenueCard } from '@/components/VenueCard';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import {
  loadFavoritePitchIds,
  subscribeFavorites,
  syncFavoritesFromServer,
} from '@/lib/favorites';

export function PlayerFavoritesView() {
  const [venues, setVenues] = useState<CatalogVenue[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      await syncFavoritesFromServer();
      if (cancelled) return;
      const ids = new Set(loadFavoritePitchIds());
      const { items } = await fetchCatalog();
      if (cancelled) return;
      setVenues(items.filter((v) => ids.has(v.pitchId)));
    }

    void refresh();
    const unsub = subscribeFavorites(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return (
    <>
      <PageIntro
        title="علاقه‌مندی‌ها"
        description="مجموعه‌هایی که به علاقه‌مندی‌ها اضافه کرده‌اید."
      />
      <DataSection title="لیست">
        {venues.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            موردی نیست. در{' '}
            <Link href="/gallery">گالری زمین‌ها</Link> یا{' '}
            <Link href="/reserve">رزرو</Link> روی{' '}
            <span aria-hidden>♥</span> کنار هر مجموعه بزنید (بعد از ورود).
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
