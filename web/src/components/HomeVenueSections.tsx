'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { VenueCard } from '@/components/VenueCard';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { numFa } from '@/lib/jalali';
import {
  fetchPublicSiteSettings,
  orderCatalogForHome,
  SITE_SETTINGS_DEFAULTS,
} from '@/lib/site-settings';

export function HomeVenueSections() {
  const [items, setItems] = useState<CatalogVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCount, setPreviewCount] = useState(
    SITE_SETTINGS_DEFAULTS.homeVenuePreviewCount,
  );
  const [featuredPlacements, setFeaturedPlacements] = useState(
    SITE_SETTINGS_DEFAULTS.homeFeaturedPlacements,
  );

  useEffect(() => {
    void fetchPublicSiteSettings().then((s) => {
      setPreviewCount(s.homeVenuePreviewCount);
      setFeaturedPlacements(s.homeFeaturedPlacements);
    });
    void fetchCatalog()
      .then(({ items: list }) => setItems(list))
      .finally(() => setLoading(false));
  }, []);

  const ordered = useMemo(
    () => orderCatalogForHome(items, featuredPlacements),
    [items, featuredPlacements],
  );
  const preview = ordered.slice(0, previewCount);
  const hasMore = ordered.length > preview.length;
  const gridCols = Math.max(1, previewCount);

  return (
    <section className="section home-venues-section">
      <div className="section-head">
        <div>
          <h2>زمین‌های پیشنهادی</h2>
          <p>چند زمین برای شروع — بقیه در همان صفحهٔ رزرو</p>
        </div>
      </div>

      {loading ? (
        <p className="muted-sm home-venues-loading">در حال بارگذاری زمین‌ها…</p>
      ) : !preview.length ? (
        <p className="muted-sm home-venues-empty">
          فعلاً زمینی برای نمایش نیست —{' '}
          <Link href="/reserve">رفتن به رزرو</Link>
        </p>
      ) : (
      <div
        className="venue-grid-home-preview"
        style={{ '--home-venue-cols': gridCols } as CSSProperties}
      >
        {preview.map((v, i) => (
          <VenueCard
            key={v.pitchId}
            venue={v}
            stagger={i * 70}
            imageSizes="(max-width: 380px) 100vw, (max-width: 639px) 46vw, (max-width: 899px) 46vw, 22vw"
          />
        ))}
      </div>
      )}

      {!loading && preview.length > 0 && (
        hasMore ? (
          <div className="section-more-actions">
            <Link href="/reserve" className="btn btn-secondary">
              رزرو از بین {numFa(ordered.length)} زمین
            </Link>
          </div>
        ) : (
          <div className="section-more-actions">
            <Link href="/reserve" className="btn btn-ghost btn-sm">
              رفتن به رزرو
            </Link>
          </div>
        )
      )}
    </section>
  );
}
