import Link from 'next/link';
import { VenueImage } from '@/components/VenueImage';
import { Reveal } from '@/components/Reveal';
import { CATEGORY_LABEL } from '@/data/venues';
import type { CatalogVenue } from '@/lib/catalog';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { tehranZoneLabel } from '@/lib/tehran-zones';

type Props = { venue: CatalogVenue; stagger?: number };

export function VenueCard({ venue, stagger = 0 }: Props) {
  const galleryQuery = new URLSearchParams({ pitchId: venue.pitchId }).toString();
  const galleryHref = `/gallery/${venue.slug}?${galleryQuery}`;
  const reserveQuery = new URLSearchParams({
    pitchId: venue.pitchId,
    venue: venue.slug,
  }).toString();

  return (
    <Reveal delay={stagger} className="venue-card-wrap">
      <article className="venue-card">
        <Link href={galleryHref} className="venue-card-media">
          <VenueImage
            src={venue.image}
            category={venue.category}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="venue-card-img"
          />
          <span className="venue-badge">{CATEGORY_LABEL[venue.category]}</span>
          {venue.featured && <span className="venue-badge featured">پیشنهادی</span>}
        </Link>
        <div className="venue-card-body">
          <h2 className="venue-card-title">
            <Link href={galleryHref}>{venue.name}</Link>
          </h2>
          <p className="venue-card-meta">
            {tehranZoneLabel(venue.zone)} · {pitchSizeLabel(venue.size)}
          </p>
          <p className="venue-card-address">{venue.address}</p>
          <ul className="venue-tags">
            {venue.tags.slice(0, 3).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="venue-card-foot">
            <div className="price-block">
              <p className="price-row">
                <span className="price-label">از</span>
                <span className="price-val">{priceFa(venue.priceFrom)}</span>
                <span className="price-unit">تومان</span>
              </p>
              <span className="avail">{venue.availSlots} سانس خالی</span>
            </div>
            <Link
              href={`/reserve?${reserveQuery}`}
              className="btn btn-primary btn-sm venue-reserve-btn"
            >
              رزرو
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
