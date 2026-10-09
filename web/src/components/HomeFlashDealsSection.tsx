'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/components/Reveal';
import { fetchFlashDeals, type FlashDeal } from '@/lib/flash-deals';
import { numFa } from '@/lib/jalali';
import { priceFa } from '@/lib/format';

export function HomeFlashDealsSection() {
  const [deals, setDeals] = useState<FlashDeal[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchFlashDeals(8).then((list) => {
        if (!cancelled) setDeals(list);
      });
    };
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!deals.length) return null;

  return (
    <section className="section flash-deals-section" aria-labelledby="flash-deals-title">
      <Reveal>
        <div className="section-head">
          <div>
            <p className="eyebrow">پر کردن سریع سانس</p>
            <h2 id="flash-deals-title">سانس‌های لحظه‌آخر با تخفیف</h2>
            <p className="muted-sm">
              کمتر از یک ساعت تا شروع مانده و هنوز خالی است — قیمت موقت پایین‌تر می‌آید
            </p>
          </div>
          <Link href="/reserve" className="btn btn-ghost btn-sm">
            همه سانس‌ها
          </Link>
        </div>
      </Reveal>
      <div className="flash-deals-grid">
        {deals.map((d, i) => {
          const q = new URLSearchParams({
            pitchId: d.pitchId,
            venue: d.slug,
          });
          return (
            <Reveal key={`${d.pitchId}-${d.slotIndex}`} delay={i * 50}>
              <article className="flash-deal-card panel">
                <div className="flash-deal-media">
                  <Image src={d.image} alt="" fill sizes="200px" className="flash-deal-img" />
                  <span className="flash-deal-badge">
                    {d.urgency === '30m' ? '۳۰ دقیقه' : '۱ ساعت'} · {numFa(d.discountPercent)}٪
                  </span>
                </div>
                <div className="flash-deal-body">
                  <h3 className="flash-deal-title">{d.pitchName}</h3>
                  <p className="muted-sm">
                    {d.city} · {d.time}
                  </p>
                  <p className="flash-deal-price">
                    <span className="flash-deal-old">{priceFa(d.originalSitePrice)}</span>
                    <strong>{priceFa(d.sitePrice)}</strong>
                    <span className="price-unit">تومان</span>
                  </p>
                  <Link
                    href={`/reserve?${q.toString()}&slot=${d.slotIndex}`}
                    className="btn btn-primary btn-sm"
                  >
                    رزرو همین سانس
                  </Link>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
