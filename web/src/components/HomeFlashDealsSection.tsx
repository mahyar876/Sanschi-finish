'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VenueImage } from '@/components/VenueImage';
import { CATEGORY_LABEL } from '@/data/venues';
import { fetchHomeFlashDeals, type FlashDeal } from '@/lib/flash-deals';
import { numFa } from '@/lib/jalali';
import { priceFa } from '@/lib/format';

const HOME_FLASH_LIMIT = 4;

export function HomeFlashDealsSection() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchHomeFlashDeals(HOME_FLASH_LIMIT)
        .then((list) => {
          if (!cancelled) setDeals(list.slice(0, HOME_FLASH_LIMIT));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <section className="section flash-deals-section" aria-labelledby="flash-deals-title">
      <div className="flash-deals-panel">
        <div className="section-head flash-deals-head">
          <div>
            <p className="eyebrow">پر کردن سریع سانس</p>
            <h2 id="flash-deals-title">سانس‌های لحظه‌آخر با تخفیف</h2>
            <p className="muted-sm">
              کمتر از یک ساعت تا شروع — فقط همین سانس‌ها با قیمت موقت
            </p>
          </div>
        </div>

        {loading ? (
          <p className="muted-sm flash-deals-loading">در حال بارگذاری سانس‌ها…</p>
        ) : deals.length === 0 ? (
          <p className="muted-sm flash-deals-empty">
            فعلاً سانس لحظه‌آخری ثبت نشده —{' '}
            <Link href="/reserve">از صفحه رزرو</Link> سانس‌های امروز را ببینید.
          </p>
        ) : (
          <div className="flash-deals-grid">
            {deals.map((d) => {
              const q = new URLSearchParams({
                pitchId: d.pitchId,
                venue: d.slug,
              });
              const reserveHref = `/reserve?${q.toString()}&slot=${d.slotIndex}`;
              return (
                <article key={`${d.pitchId}-${d.slotIndex}`} className="flash-deal-card">
                  <Link href={reserveHref} className="flash-deal-media" tabIndex={-1}>
                    <VenueImage
                      src={d.image}
                      category={d.category}
                      alt=""
                      fill
                      sizes="(max-width: 380px) 96px, (max-width: 639px) 42vw, (max-width: 899px) 44vw, 220px"
                      className="flash-deal-img"
                    />
                  </Link>
                  <div className="flash-deal-body">
                    <div className="flash-deal-chips">
                      <span className="flash-deal-chip flash-deal-chip--hot">لحظه‌آخر</span>
                      <span className="flash-deal-chip">
                        {numFa(d.discountPercent)}٪ تخفیف
                      </span>
                      <span className="flash-deal-chip flash-deal-chip--urgency">
                        {d.urgency === '30m' ? 'زیر ۳۰ دقیقه' : 'زیر ۱ ساعت'}
                      </span>
                      <span className="flash-deal-chip flash-deal-chip--time">{d.time}</span>
                    </div>
                    <h3 className="flash-deal-title">
                      <Link href={reserveHref}>{d.pitchName}</Link>
                    </h3>
                    <p className="flash-deal-meta">
                      {[d.city, d.category ? CATEGORY_LABEL[d.category] : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <div className="flash-deal-foot">
                      <div className="flash-deal-price-block">
                        <span className="flash-deal-old">{priceFa(d.originalSitePrice)}</span>
                        <p className="flash-deal-price-main">
                          <strong>{priceFa(d.sitePrice)}</strong>
                          <span className="price-unit">تومان</span>
                        </p>
                      </div>
                      <Link href={reserveHref} className="btn btn-primary btn-sm flash-deal-cta">
                        رزرو
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="section-more-actions flash-deals-more">
            <Link href="/reserve" className="btn btn-secondary btn-sm">
              همه سانس‌ها
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
