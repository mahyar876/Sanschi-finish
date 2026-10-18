import Link from 'next/link';
import { VenueImage } from '@/components/VenueImage';
import { Reveal } from '@/components/Reveal';
import { CATEGORY_LABEL } from '@/data/venues';
import type { CatalogVenue } from '@/lib/catalog';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { tehranZoneLabel } from '@/lib/tehran-zones';
type Props = {
  venue: CatalogVenue;
  stagger?: number;
  /** override برای گرید یک‌ردیفی صفحهٔ اصلی */
  imageSizes?: string;
  /** لینک رزرو (مثلاً با تاریخ و سانس از دستیار) */
  reserveHref?: string;
  /** جایگزین «X سانس خالی» */
  availLabel?: string;
  /** پیش‌وند قیمت؛ پیش‌فرض «از» — برای سانس مشخص خالی بگذارید */
  pricePrefix?: string;
};

export function VenueCard({
  venue,
  stagger = 0,
  imageSizes,
  reserveHref,
  availLabel,
  pricePrefix = 'از',
}: Props) {
  const reserveQuery = new URLSearchParams({
    pitchId: venue.pitchId,
    venue: venue.slug,
  }).toString();
  const reserveLink = reserveHref ?? `/reserve?${reserveQuery}`;

  return (
    <Reveal delay={stagger} className="venue-card-wrap">
      <article className="venue-card">
        <Link href={reserveLink} className="venue-card-media">
          <VenueImage
            src={venue.image}
            category={venue.category}
            alt=""
            fill
            sizes={
              imageSizes ?? '(max-width: 768px) 100vw, 33vw'
            }
            className="venue-card-img"
          />
          <span className="venue-badge">{CATEGORY_LABEL[venue.category]}</span>
          {venue.featured && <span className="venue-badge featured">پیشنهادی</span>}
        </Link>
        <div className="venue-card-body">
          <h2 className="venue-card-title">
            <Link href={reserveLink}>{venue.name}</Link>
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
          <div className="venue-card-foot flash-deal-foot">
            <div className="flash-deal-price-block">
              <p className="flash-deal-price-main">
                {pricePrefix ? (
                  <span className="price-label">{pricePrefix}</span>
                ) : null}
                <strong>{priceFa(venue.priceFrom)}</strong>
                <span className="price-unit">تومان</span>
              </p>
              <span className="avail">
                {availLabel ?? `${venue.availSlots} سانس خالی`}
              </span>
            </div>
            <Link
              href={reserveLink}
              className="btn btn-primary btn-sm flash-deal-cta"
            >
              رزرو
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
