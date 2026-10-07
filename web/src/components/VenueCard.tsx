import Image from 'next/image';
import Link from 'next/link';
import { CATEGORY_LABEL, type Venue } from '@/data/venues';
import { priceFa } from '@/lib/format';

type Props = { venue: Venue };

export function VenueCard({ venue }: Props) {
  const reserveQuery = new URLSearchParams({ venue: venue.slug }).toString();
  return (
    <article className="venue-card">
      <div className="venue-card-media">
        <Image
          src={venue.image}
          alt={`${venue.name} — ${CATEGORY_LABEL[venue.category]} — رزرو آنلاین سانس‌چی`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="venue-card-img"
        />
        <span className="venue-badge">{CATEGORY_LABEL[venue.category]}</span>
        {venue.featured && <span className="venue-badge featured">پیشنهادی</span>}
      </div>
      <div className="venue-card-body">
        <h2 className="venue-card-title">{venue.name}</h2>
        <p className="venue-card-meta">
          {venue.city} · {venue.size} نفره
        </p>
        <p className="venue-card-address">{venue.address}</p>
        <ul className="venue-tags">
          {venue.tags.slice(0, 3).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="venue-card-foot">
          <div>
            <span className="price-label">از</span>{' '}
            <span className="price-val">{priceFa(venue.priceFrom)}</span>{' '}
            <span className="price-unit">تومان</span>
            <span className="avail">{venue.availSlots} سانس خالی</span>
          </div>
          <Link href={`/reserve?${reserveQuery}`} className="btn btn-primary btn-sm">
            رزرو
          </Link>
        </div>
      </div>
    </article>
  );
}
