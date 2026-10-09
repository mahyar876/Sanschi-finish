'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_MAP_CENTER,
  getGoogleMapsApiKey,
  parseCoords,
} from '@/lib/google-maps';
import { loadGoogleMapsApi } from '@/lib/load-google-maps';

type Props = {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number } | { lat: undefined; lng: undefined }) => void;
  /** برای جستجوی اولیه در Geocoder وقتی Autocomplete در دسترس نیست */
  addressHint?: string;
};

export function GoogleMapLocationPicker({ lat, lng, onChange, addressHint }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const hasKey = Boolean(getGoogleMapsApiKey());

  function setMarkerPosition(position: google.maps.LatLngLiteral) {
    onChange({ lat: position.lat, lng: position.lng });
    if (mapRef.current) {
      mapRef.current.setCenter(position);
      if (!markerRef.current && mapRef.current) {
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position,
          draggable: true,
          title: 'موقعیت زمین',
        });
        markerRef.current.addListener('dragend', () => {
          const pos = markerRef.current?.getPosition();
          if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
        });
      } else if (markerRef.current) {
        markerRef.current.setPosition(position);
      }
    }
  }

  useEffect(() => {
    if (!hasKey || !mapEl.current) return;
    let cancelled = false;
    setLoadErr('');

    void loadGoogleMapsApi()
      .then((g) => {
        if (cancelled || !mapEl.current) return;
        const initial = parseCoords(lat, lng);
        const center = initial ?? DEFAULT_MAP_CENTER;
        const map = new g.maps.Map(mapEl.current, {
          center,
          zoom: initial ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          const ll = e.latLng;
          if (!ll) return;
          setMarkerPosition({ lat: ll.lat(), lng: ll.lng() });
        });

        if (initial) {
          markerRef.current = new g.maps.Marker({
            map,
            position: initial,
            draggable: true,
            title: 'موقعیت زمین',
          });
          markerRef.current.addListener('dragend', () => {
            const pos = markerRef.current?.getPosition();
            if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
          });
        }

        if (searchRef.current && g.maps.places) {
          const ac = new g.maps.places.Autocomplete(searchRef.current, {
            fields: ['geometry', 'formatted_address'],
            componentRestrictions: { country: 'ir' },
          });
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            const loc = place.geometry?.location;
            if (loc) setMarkerPosition({ lat: loc.lat(), lng: loc.lng() });
          });
        }

        setMapReady(true);

        if (!initial && addressHint?.trim()) {
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode({ address: addressHint }, (results, status) => {
            if (status === 'OK' && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              map.setCenter({ lat: loc.lat(), lng: loc.lng() });
            }
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'خطا در نقشه');
      });

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount; coords synced below
  }, [hasKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const coords = parseCoords(lat, lng);
    if (!coords) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setPosition(coords);
    } else {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: coords,
        draggable: true,
      });
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition();
        if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
      });
    }
    mapRef.current.setCenter(coords);
    mapRef.current.setZoom(16);
  }, [lat, lng, mapReady, onChange]);

  function geocodeAddress() {
    const q = searchRef.current?.value.trim() || addressHint?.trim();
    if (!q || !window.google?.maps) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: q }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setMarkerPosition({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMarkerPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <div className="map-location-picker">
      {hasKey ? (
        <>
          <div className="map-picker-toolbar">
            <input
              ref={searchRef}
              type="search"
              className="map-search-input"
              placeholder="جستجو در Google Maps (آدرس یا نام مکان)"
              defaultValue={addressHint || ''}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={geocodeAddress}>
              یافتن
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation}>
              موقعیت من
            </button>
          </div>
          {loadErr && <p className="form-msg err">{loadErr}</p>}
          <div ref={mapEl} className="map-picker-canvas" role="application" aria-label="انتخاب موقعیت روی نقشه" />
          <p className="muted-sm map-picker-hint">
            روی نقشه کلیک کنید یا نشانگر را بکشید. برای ذخیره، دکمه ذخیره فرم را بزنید.
          </p>
        </>
      ) : (
        <p className="notice map-picker-no-key">
          برای نقشه تعاملی Google، کلید API را در{' '}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> قرار دهید (سهمیه رایگان ماهانه Google).
          تا آن زمان می‌توانید مختصات را دستی وارد کنید.
        </p>
      )}
      <div className="field-row">
        <div className="field">
          <label>عرض جغرافیایی (Latitude)</label>
          <input
            type="number"
            step="any"
            value={lat ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChange({ lat: undefined, lng: undefined });
                return;
              }
              const nextLat = parseFloat(v);
              onChange({
                lat: nextLat,
                lng: typeof lng === 'number' ? lng : DEFAULT_MAP_CENTER.lng,
              });
            }}
          />
        </div>
        <div className="field">
          <label>طول جغرافیایی (Longitude)</label>
          <input
            type="number"
            step="any"
            value={lng ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onChange({ lat: undefined, lng: undefined });
                return;
              }
              const nextLng = parseFloat(v);
              onChange({
                lat: typeof lat === 'number' ? lat : DEFAULT_MAP_CENTER.lat,
                lng: nextLng,
              });
            }}
          />
        </div>
      </div>
      {parseCoords(lat, lng) && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ lat: undefined, lng: undefined })}
        >
          حذف موقعیت
        </button>
      )}
    </div>
  );
}
