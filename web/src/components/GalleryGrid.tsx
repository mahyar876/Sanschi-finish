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
  GalleryFilterSidebar,
  EMPTY_GALLERY_SIDEBAR_FILTERS,
  type GallerySidebarFilters,
} from '@/components/GalleryFilterSidebar';
import {
  SLOT_PERIOD_OPTIONS,
  catalogMatchesMinCapacity,
  catalogMatchesSlotPeriods,
  type SlotPeriodFilter,
} from '@/lib/gallery-filters';
import { parseCoords } from '@/lib/google-maps';

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

  const mappableCount = useMemo(
    () => list.filter((v) => parseCoords(v.lat, v.lng) !== null).length,
    [list],
  );

  useEffect(() => {
    if (view !== 'map') return;
    if (!list.length) {
      setMapSelectedPitchId(null);
      return;
    }
    if (!mapSelectedPitchId || !list.some((v) => v.pitchId === mapSelectedPitchId)) {
      setMapSelectedPitchId(list[0]!.pitchId);
    }
  }, [view, list, mapSelectedPitchId]);

  return (
    <>
      {!live && items.length > 0 && (
        <p className="catalog-hint muted-sm" role="status">
          نمایش از کاتالوگ محلی — برای سانس زنده، API را متصل کنید.
        </p>
      )}

      <div className="gallery-layout">
        <div className="gallery-filters-top">
          <div className="gallery-filters">
            <div className="gallery-filter-block">
              <span className="gallery-filter-label">نمایش</span>
              <div className="chips chip-scroll-wrap" role="tablist" aria-label="نمایش گالری">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'grid'}
                  className={view === 'grid' ? 'chip active' : 'chip'}
                  onClick={() => setView('grid')}
                >
                  لیست کارت‌ها
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'map'}
                  className={view === 'map' ? 'chip active' : 'chip'}
                  onClick={() => setView('map')}
                >
                  نقشه تهران
                </button>
              </div>
            </div>

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

            <div className="gallery-filter-block">
              <span className="gallery-filter-label">ساعت سانس</span>
              <div
                className="chips chip-scroll-wrap"
                role="group"
                aria-label="فیلتر ساعت سانس"
              >
                {SLOT_PERIOD_OPTIONS.map((p) => {
                  const active = sidebarFilters.slotPeriods.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      className={active ? 'chip active' : 'chip'}
                      onClick={() => {
                        const set = new Set(sidebarFilters.slotPeriods);
                        if (set.has(p.id)) set.delete(p.id);
                        else set.add(p.id);
                        setSidebarFilters({
                          ...sidebarFilters,
                          slotPeriods: [...set] as SlotPeriodFilter[],
                        });
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <GalleryFilterSidebar
              filters={sidebarFilters}
              onChange={setSidebarFilters}
            />
          </div>
        </div>

        <p className="result-count">
          {numFa(list.length)} مورد در تهران — رزرو آنلاین چمن، فوتسال و والیبال
        </p>
        {list.length === 0 ? (
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
          <GalleryVenuesMap
            venues={list}
            selectedPitchId={mapSelectedPitchId}
            onSelectPitchId={setMapSelectedPitchId}
          />
        ) : (
          <>
            {mappableCount > 0 ? (
              <GalleryVenuesMap
                venues={list}
                compact
                selectedPitchId={mapSelectedPitchId}
                onSelectPitchId={setMapSelectedPitchId}
              />
            ) : null}
            <div className="venue-grid">
              {list.map((v) => (
                <VenueCard key={v.pitchId} venue={v} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
