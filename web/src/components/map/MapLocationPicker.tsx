'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_CENTER, parseCoords } from '@/lib/google-maps';

type Props = {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number } | { lat: undefined; lng: undefined }) => void;
  addressHint?: string;
  onAddressResolved?: (label: string) => void;
};

type LeafletModule = typeof import('leaflet');

function sameCoords(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number },
  eps = 1e-7,
) {
  if (!a) return false;
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;
}

export function MapLocationPicker({ lat, lng, onChange, addressHint, onAddressResolved }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [search, setSearch] = useState(addressHint || '');
  const [geoMsg, setGeoMsg] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  /** فقط نشانگر روی نقشه — بدون setState والد (جلوگیری از حلقهٔ بی‌نهایت) */
  const syncMarkerVisual = useCallback(
    (L: LeafletModule, position: { lat: number; lng: number }, fly = true) => {
      if (!mapRef.current) return;
      if (!markerRef.current) {
        markerRef.current = L.marker([position.lat, position.lng], { draggable: true }).addTo(
          mapRef.current,
        );
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current?.getLatLng();
          if (!ll) return;
          const next = { lat: ll.lat, lng: ll.lng };
          const cur = parseCoords(lat, lng);
          if (sameCoords(cur, next)) return;
          onChangeRef.current(next);
        });
      } else {
        markerRef.current.setLatLng([position.lat, position.lng]);
      }
      if (fly) mapRef.current.setView([position.lat, position.lng], 16, { animate: true });
    },
    [lat, lng],
  );

  const applyUserPosition = useCallback(
    (L: LeafletModule, position: { lat: number; lng: number }, fly = true) => {
      const cur = parseCoords(lat, lng);
      if (sameCoords(cur, position)) {
        syncMarkerVisual(L, position, fly);
        return;
      }
      syncMarkerVisual(L, position, fly);
      onChangeRef.current({ lat: position.lat, lng: position.lng });
    },
    [lat, lng, syncMarkerVisual],
  );

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
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

      leafletRef.current = L;
      const initial = parseCoords(lat, lng) ?? DEFAULT_MAP_CENTER;
      const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(
        [initial.lat, initial.lng],
        parseCoords(lat, lng) ? 16 : 12,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        applyUserPosition(L, { lat: e.latlng.lat, lng: e.latlng.lng });
      });

      if (parseCoords(lat, lng)) {
        syncMarkerVisual(L, { lat: lat!, lng: lng! }, false);
      }

      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !mapRef.current) return;
    const coords = parseCoords(lat, lng);
    if (!coords) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const ll = markerRef.current?.getLatLng();
    if (ll && sameCoords({ lat: ll.lat, lng: ll.lng }, coords)) return;
    syncMarkerVisual(L, coords, false);
  }, [lat, lng, mapReady, syncMarkerVisual]);

  useEffect(() => {
    if (addressHint) setSearch(addressHint);
  }, [addressHint]);

  async function geocodeAddress() {
    const q = search.trim();
    if (!q) {
      setGeoMsg('آدرس را بنویسید');
      return;
    }
    setGeoBusy(true);
    setGeoMsg('');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        success?: boolean;
        lat?: number;
        lng?: number;
        label?: string;
        message?: string;
      };
      if (!res.ok || !data.success || data.lat == null || data.lng == null) {
        setGeoMsg(data.message || 'آدرسی پیدا نشد');
        return;
      }
      const L = leafletRef.current;
      if (L) applyUserPosition(L, { lat: data.lat, lng: data.lng });
      else onChangeRef.current({ lat: data.lat, lng: data.lng });
      if (data.label) onAddressResolved?.(data.label);
      setGeoMsg('✓ روی نقشه نشان داده شد — ذخیره را بزنید');
    } catch {
      setGeoMsg('خطا در جستجو');
    } finally {
      setGeoBusy(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoMsg('مرورگر موقعیت را پشتیبانی نمی‌کند');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const L = leafletRef.current;
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (L) applyUserPosition(L, p);
        else onChangeRef.current(p);
        setGeoMsg('موقعیت فعلی شما روی نقشه');
      },
      () => setGeoMsg('دسترسی به موقعیت رد شد'),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <div className="map-location-picker">
      <div className="map-picker-toolbar">
        <input
          type="search"
          className="map-search-input"
          placeholder="آدرس یا نام مکان (مثلاً تهران، ونک، …)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void geocodeAddress();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={geoBusy}
          onClick={() => void geocodeAddress()}
        >
          {geoBusy ? '…' : 'نمایش روی نقشه'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation}>
          موقعیت من
        </button>
      </div>
      {geoMsg && <p className={`form-msg ${geoMsg.startsWith('✓') ? 'ok' : ''}`}>{geoMsg}</p>}
      <div ref={mapEl} className="map-picker-canvas" role="application" aria-label="انتخاب موقعیت" />
      <p className="muted-sm map-picker-hint">
        روی نقشه کلیک کنید یا نشانگر را بکشید. نیازی به کلید Google نیست.
      </p>
      <div className="field-row">
        <div className="field">
          <label>عرض جغرافیایی</label>
          <input
            type="number"
            step="any"
            value={lat ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChangeRef.current({ lat: undefined, lng: undefined });
                return;
              }
              onChangeRef.current({
                lat: parseFloat(v),
                lng: typeof lng === 'number' ? lng : DEFAULT_MAP_CENTER.lng,
              });
            }}
          />
        </div>
        <div className="field">
          <label>طول جغرافیایی</label>
          <input
            type="number"
            step="any"
            value={lng ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChangeRef.current({ lat: undefined, lng: undefined });
                return;
              }
              onChangeRef.current({
                lat: typeof lat === 'number' ? lat : DEFAULT_MAP_CENTER.lat,
                lng: parseFloat(v),
              });
            }}
          />
        </div>
      </div>
      {parseCoords(lat, lng) && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChangeRef.current({ lat: undefined, lng: undefined })}
        >
          حذف موقعیت
        </button>
      )}
    </div>
  );
}
