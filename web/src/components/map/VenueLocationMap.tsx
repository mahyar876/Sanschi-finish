'use client';

import { useEffect, useRef } from 'react';
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
  parseCoords,
} from '@/lib/google-maps';
import { attachStandardTileLayer, getMapTileConfig } from '@/lib/map-tiles';

type Props = {
  lat?: number;
  lng?: number;
  title?: string;
  address?: string;
  city?: string;
};

/** نقشهٔ موقعیت با OpenStreetMap — بدون وابستگی به Google Embed (در ایران پایدارتر) */
export function VenueLocationMap({ lat, lng, title, address, city }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const label = title || address || 'موقعیت مجموعه';
  const coords = parseCoords(lat, lng);

  useEffect(() => {
    if (!coords || !mapEl.current) return;
    let cancelled = false;
    mapRef.current?.remove();
    mapRef.current = null;

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

      attachStandardTileLayer(L, map);

      L.marker([coords.lat, coords.lng]).addTo(map);
      mapRef.current = map;

      const fixSize = () => map.invalidateSize();
      requestAnimationFrame(fixSize);
      window.setTimeout(fixSize, 150);
      window.setTimeout(fixSize, 500);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  const fullAddress =
    address && city && !address.includes(city) ? `${address}، ${city}` : address || city;

  if (!coords) {
    return (
      <section className="venue-map-section panel" aria-labelledby="venue-map-heading">
        <h2 id="venue-map-heading">آدرس و مسیر</h2>
        {fullAddress && <p className="venue-map-address">{fullAddress}</p>}
        <p className="muted-sm venue-map-empty">
          موقعیت دقیق این مجموعه هنوز روی نقشه ثبت نشده است. برای آدرس متنی با مجموعه تماس
          بگیرید یا بعداً دوباره سر بزنید.
        </p>
      </section>
    );
  }

  const tileCredit = getMapTileConfig().attribution;

  return (
    <section className="venue-map-section panel" aria-labelledby="venue-map-heading">
      <h2 id="venue-map-heading">آدرس و مسیر</h2>
      {fullAddress && <p className="venue-map-address">{fullAddress}</p>}
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
      <p
        className="muted-sm venue-map-attribution"
        dangerouslySetInnerHTML={{ __html: tileCredit }}
      />
    </section>
  );
}
