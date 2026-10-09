'use client';

import { useEffect, useMemo, useState } from 'react';
import type { VenueCategory } from '@/data/venues';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import {
  TEHRAN_ZONE_LABEL,
  TEHRAN_ZONE_ORDER,
  inferTehranZone,
  type TehranZone,
} from '@/lib/tehran-zones';
import { VenueCard } from './VenueCard';
import { numFa } from '@/lib/jalali';

type Filter = 'all' | VenueCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'futsal', label: 'فوتسال' },
  { id: 'volleyball', label: 'والیبال' },
  { id: 'grass', label: 'چمن' },
  { id: 'multi', label: 'چندمنظوره' },
];

type SortId = 'default' | 'price-asc' | 'price-desc' | 'avail';

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'default', label: 'پیش‌فرض' },
  { id: 'price-asc', label: 'ارزان‌ترین' },
  { id: 'price-desc', label: 'گران‌ترین' },
  { id: 'avail', label: 'بیشترین سانس' },
];

function resolveZone(v: CatalogVenue): TehranZone {
  return v.zone ?? inferTehranZone(v.address, v.lng);
}

export function GalleryGrid() {
  const [items, setItems] = useState<CatalogVenue[]>([]);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [zone, setZone] = useState<TehranZone | 'all'>('all');
  const [sort, setSort] = useState<SortId>('default');

  useEffect(() => {
    void fetchCatalog().then(({ items: list, live: fromApi }) => {
      setItems(list);
      setLive(fromApi);
    });
  }, []);

  const list = useMemo(() => {
    let rows =
      filter === 'all' ? [...items] : items.filter((v) => v.category === filter);
    if (zone !== 'all') rows = rows.filter((v) => resolveZone(v) === zone);
    if (sort === 'price-asc') rows.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === 'price-desc') rows.sort((a, b) => b.priceFrom - a.priceFrom);
    if (sort === 'avail') rows.sort((a, b) => b.availSlots - a.availSlots);
    return rows;
  }, [items, filter, zone, sort]);

  return (
    <>
      {!live && items.length > 0 && (
        <p className="catalog-hint muted-sm" role="status">
          نمایش از کاتالوگ محلی — برای سانس زنده، API را متصل کنید.
        </p>
      )}

      <div className="gallery-filters">
        <div className="gallery-filter-block">
          <span className="gallery-filter-label">نوع مجموعه</span>
          <div className="chips chip-scroll-wrap" role="tablist" aria-label="فیلتر نوع زمین">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={filter === f.id ? 'chip active' : 'chip'}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="gallery-filter-block">
          <span className="gallery-filter-label">محدوده تهران</span>
          <div className="chips chip-scroll-wrap" role="tablist" aria-label="فیلتر محدوده">
            <button
              type="button"
              role="tab"
              aria-selected={zone === 'all'}
              className={zone === 'all' ? 'chip active' : 'chip'}
              onClick={() => setZone('all')}
            >
              همه
            </button>
            {TEHRAN_ZONE_ORDER.map((z) => (
              <button
                key={z}
                type="button"
                role="tab"
                aria-selected={zone === z}
                className={zone === z ? 'chip active' : 'chip'}
                onClick={() => setZone(z)}
              >
                {TEHRAN_ZONE_LABEL[z]}
              </button>
            ))}
          </div>
        </div>

        <div className="gallery-filter-block gallery-filter-block--sort">
          <span className="gallery-filter-label">مرتب‌سازی</span>
          <div className="chips chip-scroll-wrap" role="tablist" aria-label="مرتب‌سازی">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={sort === s.id}
                className={sort === s.id ? 'chip active' : 'chip'}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="result-count">
        {numFa(list.length)} مورد در تهران — رزرو آنلاین چمن، فوتسال و والیبال
      </p>
      <div className="venue-grid">
        {list.map((v) => (
          <VenueCard key={v.pitchId} venue={v} />
        ))}
      </div>
    </>
  );
}
