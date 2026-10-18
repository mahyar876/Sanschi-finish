'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { VenueImage } from '@/components/VenueImage';
import { CATEGORY_LABEL } from '@/data/venues';
import type { VenueCategory } from '@/data/venues';
import type { CatalogVenue } from '@/lib/catalog';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import {
  DEFAULT_MAP_CENTER,
  googleMapsDirectionsUrl,
  parseCoords,
} from '@/lib/google-maps';
import { attachStandardTileLayer, getMapTileConfig } from '@/lib/map-tiles';
import { tehranZoneLabel } from '@/lib/tehran-zones';

type Props = {
  venues: CatalogVenue[];
  selectedPitchId?: string | null;
  onSelectPitchId?: (pitchId: string | null) => void;
  /** نقشهٔ جمع‌وجور بالای لیست کارت‌ها */
  compact?: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reserveHref(v: CatalogVenue): string {
  const q = new URLSearchParams({ pitchId: v.pitchId, venue: v.slug }).toString();
  return `/reserve?${q}`;
}

function buildGalleryPopupHtml(v: CatalogVenue): string {
  const featuredBadge = v.featured
    ? '<span class="gallery-map-popup-tag">پیشنهادی</span>'
    : '';
  const addressLine = `${v.address}${v.city ? `، ${v.city}` : ''}`;
  return `
    <div class="gallery-map-popup" dir="rtl" lang="fa">
      <div class="gallery-map-popup-head">
        <strong class="gallery-map-popup-title">${escapeHtml(v.name)}</strong>
        ${featuredBadge}
      </div>
      <p class="gallery-map-popup-meta">
        <span class="gallery-map-popup-cat gallery-map-popup-cat--${escapeHtml(v.category)}">${escapeHtml(CATEGORY_LABEL[v.category])}</span>
        <span class="gallery-map-popup-dot" aria-hidden="true">·</span>
        ${escapeHtml(pitchSizeLabel(v.size))}
      </p>
      <p class="gallery-map-popup-address">${escapeHtml(addressLine)}</p>
      <div class="gallery-map-popup-foot">
        <p class="gallery-map-popup-price">
          <span class="gallery-map-popup-price-label">از</span>
          <strong>${escapeHtml(priceFa(v.priceFrom))}</strong>
          <span class="gallery-map-popup-price-unit">تومان</span>
        </p>
        <a class="gallery-map-popup-cta" href="${escapeHtml(reserveHref(v))}">رزرو این مجموعه</a>
      </div>
    </div>`;
}

function galleryMarkerIcon(
  L: typeof import('leaflet'),
  category: VenueCategory,
  featured?: boolean,
  selected?: boolean,
) {
  const cat = escapeHtml(category);
  const feat = featured ? ' is-featured' : '';
  const sel = selected ? ' is-selected' : '';
  return L.divIcon({
    className: 'gallery-map-marker-icon',
    html: `<span class="gallery-map-pin gallery-map-pin--${cat}${feat}${sel}" aria-hidden="true"><span class="gallery-map-pin-core"></span></span>`,
    iconSize: [36, 44],
    iconAnchor: [18, 40],
    popupAnchor: [0, -42],
  });
}

function openMarkerPopup(marker: import('leaflet').Marker, map: import('leaflet').Map) {
  requestAnimationFrame(() => {
    map.invalidateSize(false);
    marker.openPopup();
  });
}

function GalleryMapVenueDetail({ venue }: { venue: CatalogVenue }) {
  return (
    <>
      <div className="gallery-map-detail-media">
        <VenueImage
          src={venue.image}
          category={venue.category}
          alt=""
          fill
          sizes="320px"
          className="gallery-map-detail-img"
        />
      </div>
      <div className="gallery-map-detail-text">
        <div className="gallery-map-detail-title-row">
          <h3 className="gallery-map-detail-title">{venue.name}</h3>
          {venue.featured ? <span className="gallery-map-popup-tag">پیشنهادی</span> : null}
        </div>
        <p className="muted-sm">
          {CATEGORY_LABEL[venue.category]} · {pitchSizeLabel(venue.size)} ·{' '}
          {tehranZoneLabel(venue.zone)}
        </p>
        <p className="gallery-map-detail-address">
          {venue.address}
          {venue.city ? `، ${venue.city}` : ''}
        </p>
        <p className="gallery-map-detail-price">
          از <strong>{priceFa(venue.priceFrom)}</strong> تومان · {venue.availSlots} سانس خالی
        </p>
        <div className="gallery-map-detail-actions">
          <Link href={reserveHref(venue)} className="btn btn-primary btn-sm">
            رزرو
          </Link>
          {parseCoords(venue.lat, venue.lng) && (
            <a
              href={googleMapsDirectionsUrl(venue.lat!, venue.lng!)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              مسیریابی
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export function GalleryVenuesMap({
  venues,
  selectedPitchId,
  onSelectPitchId,
  compact = false,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markersLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const markersByPitchRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onSelectPitchIdRef = useRef(onSelectPitchId);
  onSelectPitchIdRef.current = onSelectPitchId;
  const [mapReady, setMapReady] = useState(false);

  const mappable = useMemo(
    () =>
      venues.filter((v) => {
        const c = parseCoords(v.lat, v.lng);
        return c !== null;
      }),
    [venues],
  );

  const mappableKey = useMemo(() => mappable.map((v) => v.pitchId).join('|'), [mappable]);

  const selected =
    mappable.find((v) => v.pitchId === selectedPitchId) ?? mappable[0] ?? null;

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapEl.current) return;

      leafletRef.current = L;
      const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(
        [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
        11,
      );
      attachStandardTileLayer(L, map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      const fixSize = () => map.invalidateSize();
      requestAnimationFrame(fixSize);
      window.setTimeout(fixSize, 200);
    })();

    return () => {
      cancelled = true;
      markersLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();
    markersByPitchRef.current.clear();

    for (const v of mappable) {
      const c = parseCoords(v.lat, v.lng)!;
      const isSelected = v.pitchId === selectedPitchId;
      const marker = L.marker([c.lat, c.lng], {
        icon: galleryMarkerIcon(L, v.category, v.featured, isSelected),
      });
      marker.bindPopup(buildGalleryPopupHtml(v), {
        className: 'gallery-leaflet-popup',
        minWidth: 260,
        maxWidth: 288,
        autoPan: true,
        keepInView: true,
        autoPanPadding: [28, 28],
        offset: [0, 0],
      });
      marker.on('click', () => {
        onSelectPitchIdRef.current?.(v.pitchId);
        openMarkerPopup(marker, map);
      });
      marker.addTo(layer);
      markersByPitchRef.current.set(v.pitchId, marker);
    }

    if (mappable.length > 1) {
      const bounds = L.latLngBounds(mappable.map((v) => [v.lat!, v.lng!] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    } else if (mappable.length === 1) {
      map.setView([mappable[0].lat!, mappable[0].lng!], 14);
    } else {
      map.setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 11);
    }
  }, [mapReady, mappableKey, mappable]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || !selectedPitchId) return;

    for (const v of mappable) {
      const marker = markersByPitchRef.current.get(v.pitchId);
      if (!marker) continue;
      marker.setIcon(galleryMarkerIcon(L, v.category, v.featured, v.pitchId === selectedPitchId));
    }

    const venue = mappable.find((v) => v.pitchId === selectedPitchId);
    const c = venue ? parseCoords(venue.lat, venue.lng) : null;
    if (!c) return;

    const point = map.latLngToContainerPoint([c.lat, c.lng]);
    const size = map.getSize();
    const pad = 72;
    const inView =
      point.x >= pad &&
      point.y >= pad &&
      point.x <= size.x - pad &&
      point.y <= size.y - pad;
    const marker = markersByPitchRef.current.get(selectedPitchId);
    const openAfterPan = () => {
      if (marker) openMarkerPopup(marker, map);
    };
    if (!inView) {
      map.once('moveend', openAfterPan);
      map.panTo([c.lat, c.lng], { animate: true, duration: 0.35 });
    } else {
      openAfterPan();
    }
  }, [mapReady, selectedPitchId, mappable]);

  const missingCount = venues.length - mappable.length;
  const tileCredit = getMapTileConfig().attribution;

  return (
    <section
      className={compact ? 'gallery-map-section panel gallery-map-section--compact' : 'gallery-map-section panel'}
      aria-labelledby={compact ? undefined : 'gallery-map-heading'}
    >
      <div className="gallery-map-head">
        <h2 id={compact ? undefined : 'gallery-map-heading'}>
          {compact ? 'موقعیت روی نقشه' : 'نقشه زمین‌های تهران'}
        </h2>
        <p className="muted-sm gallery-map-sub">
          {mappable.length > 0
            ? `${mappable.length} مجموعه روی نقشه — روی هر نشانگر بزنید`
            : 'هیچ مجموعه‌ای با موقعیت ثبت‌شده در این فیلتر نیست'}
          {missingCount > 0 ? ` (${missingCount} بدون مختصات)` : ''}
        </p>
      </div>

      <div className={compact ? 'gallery-map-layout gallery-map-layout--compact' : 'gallery-map-layout'}>
        <div className="gallery-map-canvas-wrap">
          <div
            ref={mapEl}
            className={compact ? 'gallery-map-canvas gallery-map-canvas--compact' : 'gallery-map-canvas'}
            role="application"
            aria-label="نقشه مجموعه‌های ورزشی تهران"
          />
        </div>

        {!compact ? (
          <aside className="gallery-map-detail" aria-live="polite">
            {selected ? (
              <GalleryMapVenueDetail venue={selected} />
            ) : (
              <p className="muted-sm gallery-map-detail-empty">
                یک نشانگر روی نقشه انتخاب کنید یا فیلترها را تغییر دهید.
              </p>
            )}
          </aside>
        ) : null}
      </div>

      <p
        className="muted-sm venue-map-attribution"
        dangerouslySetInnerHTML={{ __html: tileCredit }}
      />
    </section>
  );
}
