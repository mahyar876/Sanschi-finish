'use client';

import { useEffect, useRef } from 'react';
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  parseCoords,
} from '@/lib/google-maps';

type Props = {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
};

type LeafletModule = typeof import('leaflet');

/** نقشهٔ موقعیت با OpenStreetMap — بدون وابستگی به Google Embed (در ایران پایدارتر) */
export function VenueLocationMap({ lat, lng, title, address }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const label = title || address || 'موقعیت مجموعه';
  const coords = parseCoords(lat, lng);

  useEffect(() => {
    if (!coords || !mapEl.current || mapRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapEl.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapEl.current, {
        scrollWheelZoom: false,
        dragging: true,
        zoomControl: true,
      }).setView([coords.lat, coords.lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.marker([coords.lat, coords.lng]).addTo(map);
      mapRef.current = map;

      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coords?.lat, coords?.lng]);

  if (!coords) return null;

  return (
    <section className="venue-map-section">
      <h2>موقعیت روی نقشه</h2>
      {address && <p className="venue-map-address">{address}</p>}
      <div className="venue-map-embed-wrap venue-map-leaflet-wrap">
        <div ref={mapEl} className="venue-map-leaflet" role="img" aria-label={`نقشه ${label}`} />
      </div>
      <div className="hero-actions venue-map-actions">
        <a
          href={googleMapsDirectionsUrl(coords.lat, coords.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          مسیریابی در Google Maps
        </a>
        <a
          href={googleMapsPlaceUrl(coords.lat, coords.lng, label)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          باز کردن در نقشه
        </a>
      </div>
    </section>
  );
}
