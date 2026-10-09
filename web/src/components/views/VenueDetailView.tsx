'use client';

import Link from 'next/link';
import { VenueImage } from '@/components/VenueImage';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import {
  fetchCatalog,
  findCatalogItem,
  type CatalogVenue,
} from '@/lib/catalog';
import { CATEGORY_LABEL } from '@/data/venues';
import { toggleFavoritePitch, isFavoritePitch } from '@/lib/favorites';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { numFa } from '@/lib/jalali';
import { VenueLocationMap } from '@/components/map/VenueLocationMap';
import { parseCoords } from '@/lib/google-maps';
import { tehranZoneLabel } from '@/lib/tehran-zones';

type ReviewRow = { rating: number; text: string; createdAt?: string };

export function VenueDetailView({ slug }: { slug: string }) {
  const search = useSearchParams();
  const pitchIdParam = search.get('pitchId');
  const [venue, setVenue] = useState<CatalogVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  useEffect(() => {
    void fetchCatalog().then(({ items }) => {
      const v = findCatalogItem(items, slug, pitchIdParam);
      setVenue(v || null);
      setLoading(false);
      if (v) setFav(isFavoritePitch(v.pitchId));
    });
  }, [slug, pitchIdParam]);

  useEffect(() => {
    if (!venue || isDemoFrontend() || venue.pitchId.startsWith('demo-')) return;
    void apiFetch<{ success: boolean; reviews: ReviewRow[] }>(
      `/pitches/${venue.pitchId}/reviews`,
    )
      .then((d) => {
        if (d.success) setReviews(d.reviews);
      })
      .catch(() => {});
  }, [venue]);

  const reserveHref = useMemo(() => {
    if (!venue) return '/reserve';
    const q = new URLSearchParams({
      pitchId: venue.pitchId,
      venue: venue.slug,
    });
    return `/reserve?${q.toString()}`;
  }, [venue]);

  if (loading) {
    return (
      <div className="page page-narrow">
        <p className="subtitle">در حال بارگذاری…</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="page page-narrow">
        <h1>مجموعه پیدا نشد</h1>
        <p className="subtitle">ممکن است حذف شده یا آدرس اشتباه باشد.</p>
        <Button href="/gallery" variant="primary">
          بازگشت به گالری
        </Button>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const coords = parseCoords(venue?.lat, venue?.lng);

  return (
    <div className="page venue-detail">
      <div className="venue-detail-hero">
        <div className="venue-detail-media">
          <VenueImage
            src={venue.image}
            category={venue.category}
            alt={venue.name}
            fill
            sizes="(max-width: 900px) 100vw, 55vw"
            priority
          />
        </div>
        <div className="venue-detail-copy">
          <p className="eyebrow">{CATEGORY_LABEL[venue.category]}</p>
          <h1>{venue.name}</h1>
          <p className="venue-detail-meta">
            {tehranZoneLabel(venue.zone)} · {pitchSizeLabel(venue.size)}
          </p>
          <p>{venue.address}</p>
          <ul className="venue-tags">
            {venue.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="venue-detail-price">
            <span className="price-val">{priceFa(venue.priceFrom)}</span>
            <span className="price-unit">تومان · از</span>
            <span className="avail">{numFa(venue.availSlots)} سانس در الگوی پیش‌فرض</span>
          </div>
          {avgRating != null && (
            <p className="venue-detail-rating">
              امتیاز {numFa(Math.round(avgRating * 10) / 10)} از {numFa(reviews.length)} نظر
            </p>
          )}
          <div className="hero-actions">
            <Button href={reserveHref} variant="primary">
              رزرو سانس
            </Button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFav(toggleFavoritePitch(venue.pitchId))}
            >
              {fav ? '★ در علاقه‌مندی‌ها' : '☆ افزودن به علاقه‌مندی'}
            </button>
          </div>
        </div>
      </div>

      <section className="section prose">
        <h2>درباره مجموعه</h2>
        <p>{venue.seoDescription}</p>
      </section>

      {coords && (
        <VenueLocationMap
          lat={coords.lat}
          lng={coords.lng}
          title={venue.name}
          address={`${venue.address}، ${venue.city}`}
        />
      )}

      {reviews.length > 0 && (
        <section className="section">
          <h2>نظرات بازیکنان</h2>
          <ul className="review-list">
            {reviews.map((r, i) => (
              <li key={i} className="panel review-item">
                <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong>
                {r.text && <p>{r.text}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="muted-sm">
        <Link href="/gallery">← همه زمین‌ها</Link>
      </p>
    </div>
  );
}
