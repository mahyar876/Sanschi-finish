'use client';

import { useMemo, useState } from 'react';
import { VENUES, type VenueCategory } from '@/data/venues';
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

export function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc' | 'avail'>(
    'default',
  );

  const list = useMemo(() => {
    const items = filter === 'all' ? [...VENUES] : VENUES.filter((v) => v.category === filter);
    if (sort === 'price-asc') items.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === 'price-desc') items.sort((a, b) => b.priceFrom - a.priceFrom);
    if (sort === 'avail') items.sort((a, b) => b.availSlots - a.availSlots);
    return items;
  }, [filter, sort]);

  return (
    <>
      <div className="filter-bar">
        <div className="chips" role="tablist" aria-label="فیلتر نوع زمین">
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
        <label className="sort-wrap">
          <span className="sort-label">مرتب‌سازی</span>
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="default">پیش‌فرض</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
            <option value="avail">بیشترین سانس خالی</option>
          </select>
        </label>
      </div>
      <p className="result-count">
        {numFa(list.length)} مورد — رزرو آنلاین چمن، فوتسال و والیبال
      </p>
      <div className="venue-grid">
        {list.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </div>
    </>
  );
}
