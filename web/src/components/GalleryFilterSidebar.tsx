'use client';

import {
  MIN_CAPACITY_OPTIONS,
  PITCH_SIZE_FILTER_OPTIONS,
  type PitchSizeFilter,
  type SlotPeriodFilter,
} from '@/lib/gallery-filters';

export type GallerySidebarFilters = {
  pitchSize: PitchSizeFilter;
  minCapacity: number;
  slotPeriods: SlotPeriodFilter[];
};

type Props = {
  filters: GallerySidebarFilters;
  onChange: (next: GallerySidebarFilters) => void;
};

/** فیلترهای تکمیلی — بالای لیست زمین‌ها */
export function GalleryFilterSidebar({ filters, onChange }: Props) {
  function patch(partial: Partial<GallerySidebarFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <>
      <div className="gallery-filter-block">
        <span className="gallery-filter-label">ابعاد زمین</span>
        <div className="chips chip-scroll-wrap" role="group" aria-label="فیلتر ابعاد زمین">
          {PITCH_SIZE_FILTER_OPTIONS.map((opt) => (
            <button
              key={String(opt.id)}
              type="button"
              className={filters.pitchSize === opt.id ? 'chip active' : 'chip'}
              onClick={() => patch({ pitchSize: opt.id })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gallery-filter-block">
        <span className="gallery-filter-label">ظرفیت (نفر)</span>
        <div className="chips chip-scroll-wrap" role="group" aria-label="فیلتر ظرفیت">
          {MIN_CAPACITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={filters.minCapacity === opt.value ? 'chip active' : 'chip'}
              onClick={() => patch({ minCapacity: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export const EMPTY_GALLERY_SIDEBAR_FILTERS: GallerySidebarFilters = {
  pitchSize: 'all',
  minCapacity: 0,
  slotPeriods: [],
};
