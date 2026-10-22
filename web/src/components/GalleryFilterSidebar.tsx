'use client';

import {
  MIN_CAPACITY_OPTIONS,
  PITCH_SIZE_FILTER_OPTIONS,
  SLOT_PERIOD_OPTIONS,
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

/** @deprecated use GalleryAdvancedFilters */
export function GalleryFilterSidebar(props: Props) {
  return <GalleryAdvancedFilters {...props} />;
}

export function GalleryAdvancedFilters({ filters, onChange }: Props) {
  function patch(partial: Partial<GallerySidebarFilters>) {
    onChange({ ...filters, ...partial });
  }

  const slotPeriod = filters.slotPeriods[0] ?? '';

  return (
    <>
      <label className="gallery-select-field">
        <span className="gallery-select-label">ساعت سانس</span>
        <select
          className="gallery-select"
          value={slotPeriod}
          onChange={(e) => {
            const v = e.target.value as SlotPeriodFilter | '';
            patch({ slotPeriods: v ? [v] : [] });
          }}
          aria-label="فیلتر ساعت سانس"
        >
          <option value="">هر ساعتی</option>
          {SLOT_PERIOD_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="gallery-select-field">
        <span className="gallery-select-label">ابعاد</span>
        <select
          className="gallery-select"
          value={String(filters.pitchSize)}
          onChange={(e) => {
            const raw = e.target.value;
            patch({
              pitchSize: raw === 'all' ? 'all' : (Number(raw) as PitchSizeFilter),
            });
          }}
          aria-label="فیلتر ابعاد زمین"
        >
          {PITCH_SIZE_FILTER_OPTIONS.map((opt) => (
            <option key={String(opt.id)} value={String(opt.id)}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="gallery-select-field">
        <span className="gallery-select-label">ظرفیت</span>
        <select
          className="gallery-select"
          value={filters.minCapacity}
          onChange={(e) => patch({ minCapacity: Number(e.target.value) })}
          aria-label="فیلتر ظرفیت"
        >
          {MIN_CAPACITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export const EMPTY_GALLERY_SIDEBAR_FILTERS: GallerySidebarFilters = {
  pitchSize: 'all',
  minCapacity: 0,
  slotPeriods: [],
};
