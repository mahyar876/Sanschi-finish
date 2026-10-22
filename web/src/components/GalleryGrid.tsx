'use client';

import dynamic from 'next/dynamic';
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
import {
  GalleryAdvancedFilters,
  EMPTY_GALLERY_SIDEBAR_FILTERS,
  type GallerySidebarFilters,
} from '@/components/GalleryFilterSidebar';
import {
  catalogMatchesMinCapacity,
  catalogMatchesSlotPeriods,
} from '@/lib/gallery-filters';
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

const GalleryVenuesMap = dynamic(
  () => import('@/components/map/GalleryVenuesMap').then((m) => m.GalleryVenuesMap),
  {
    ssr: false,
    loading: () => (
      <section className="gallery-map-section panel">
        <p className="muted-sm">در حال بارگذاری نقشه…</p>
      </section>
    ),
  },
);

type GalleryView = 'grid' | 'map';

export function GalleryGrid() {
  const [items, setItems] = useState<CatalogVenue[]>([]);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [zone, setZone] = useState<TehranZone | 'all'>('all');
  const [sort, setSort] = useState<SortId>('default');
  const [sidebarFilters, setSidebarFilters] = useState<GallerySidebarFilters>(
    EMPTY_GALLERY_SIDEBAR_FILTERS,
  );
  const [view, setView] = useState<GalleryView>('grid');
  const [mapSelectedPitchId, setMapSelectedPitchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** نقشهٔ جمع‌وجور فقط دسکتاپ — روی موبایل لیست اول، نقشه با تب «نقشه» */
  const [allowInlineMap, setAllowInlineMap] = useState(false);

  useEffect(() => {
    void fetchCatalog()
      .then(({ items: list, live: fromApi }) => {
        setItems(list);
        setLive(fromApi);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setAllowInlineMap(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const list = useMemo(() => {
    let rows =
      filter === 'all' ? [...items] : items.filter((v) => v.category === filter);
    if (zone !== 'all') rows = rows.filter((v) => resolveZone(v) === zone);
    if (sidebarFilters.pitchSize !== 'all') {
      rows = rows.filter((v) => v.size === sidebarFilters.pitchSize);
    }
    if (sidebarFilters.minCapacity > 0) {
      rows = rows.filter((v) =>
        catalogMatchesMinCapacity(v.maxCapacity, sidebarFilters.minCapacity),
      );
    }
    if (sidebarFilters.slotPeriods.length > 0) {
      rows = rows.filter((v) =>
        catalogMatchesSlotPeriods(v.slotTimes, sidebarFilters.slotPeriods),
      );
    }
    if (sort === 'price-asc') rows.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === 'price-desc') rows.sort((a, b) => b.priceFrom - a.priceFrom);
    if (sort === 'avail') rows.sort((a, b) => b.availSlots - a.availSlots);
    return rows;
  }, [items, filter, zone, sort, sidebarFilters]);

  const showMap = items.length > 0;
  const showMapPanel =
    showMap && (view === 'map' || (view === 'grid' && allowInlineMap));

  useEffect(() => {
    if (!showMapPanel || !list.length) {
      setMapSelectedPitchId(null);
      return;
    }
    if (!mapSelectedPitchId || !list.some((v) => v.pitchId === mapSelectedPitchId)) {
      setMapSelectedPitchId(list[0]!.pitchId);
    }
  }, [showMapPanel, list, mapSelectedPitchId]);

  return (
    <>
      {!live && items.length > 0 && (
        <p className="catalog-hint muted-sm" role="status">
          نمایش از کاتالوگ محلی — برای سانس زنده، API را متصل کنید.
        </p>
      )}

      <div className="gallery-layout">
        <div className="gallery-toolbar">
          <div className="gallery-toolbar-head">
            <div className="gallery-view-toggle" role="tablist" aria-label="نمایش گالری">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'grid'}
                className={view === 'grid' ? 'is-active' : undefined}
                onClick={() => setView('grid')}
              >
                لیست
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'map'}
                className={view === 'map' ? 'is-active' : undefined}
                onClick={() => setView('map')}
              >
                نقشه
              </button>
            </div>
          </div>

          <div className="gallery-select-grid">
            <label className="gallery-select-field">
              <span className="gallery-select-label">نوع</span>
              <select
                className="gallery-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                aria-label="نوع مجموعه"
              >
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="gallery-select-field">
              <span className="gallery-select-label">محدوده</span>
              <select
                className="gallery-select"
                value={zone}
                onChange={(e) => setZone(e.target.value as TehranZone | 'all')}
                aria-label="محدوده تهران"
              >
                <option value="all">همهٔ تهران</option>
                {TEHRAN_ZONE_ORDER.map((z) => (
                  <option key={z} value={z}>
                    {TEHRAN_ZONE_LABEL[z]}
                  </option>
                ))}
              </select>
            </label>

            <label className="gallery-select-field">
              <span className="gallery-select-label">مرتب‌سازی</span>
              <select
                className="gallery-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                aria-label="مرتب‌سازی"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <GalleryAdvancedFilters filters={sidebarFilters} onChange={setSidebarFilters} />
          </div>
        </div>

        <p className="result-count" role="status">
          {loading
            ? 'در حال بارگذاری زمین‌ها…'
            : `${numFa(list.length)} مورد در تهران — رزرو آنلاین چمن، فوتسال و والیبال`}
        </p>
        {loading ? (
          <p className="muted-sm gallery-loading-hint">لطفاً چند لحظه صبر کنید.</p>
        ) : list.length === 0 ? (
          <div className="panel empty-state" role="status">
            {items.length === 0 && live ? (
              <>
                <p>فعلاً زمینی در سرور ثبت نشده است.</p>
                <p className="muted-sm">
                  مدیر یک‌بار <code>npm run seed</code> را روی API اجرا کند یا از پنل ادمین زمین
                  اضافه کند.
                </p>
              </>
            ) : items.length === 0 && !live ? (
              <p>کاتالوگ در دسترس نیست — API را روشن کنید (پورت ۵۰۰۰).</p>
            ) : (
              <p>با این فیلترها موردی پیدا نشد. فیلترها را عوض کنید یا «همه» را انتخاب کنید.</p>
            )}
          </div>
        ) : view === 'map' ? (
          showMapPanel ? (
            <GalleryVenuesMap
              venues={list}
              selectedPitchId={mapSelectedPitchId}
              onSelectPitchId={setMapSelectedPitchId}
            />
          ) : null
        ) : (
          <>
            <div className="venue-grid gallery-venue-grid">
              {list.map((v) => (
                <VenueCard key={v.pitchId} venue={v} />
              ))}
            </div>
            {showMapPanel ? (
              <GalleryVenuesMap
                venues={list}
                compact
                selectedPitchId={mapSelectedPitchId}
                onSelectPitchId={setMapSelectedPitchId}
              />
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
