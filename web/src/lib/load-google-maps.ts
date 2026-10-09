import { getGoogleMapsApiKey } from '@/lib/google-maps';

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMapsApi(): Promise<typeof google> {
  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY تنظیم نشده'));
  }
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps فقط در مرورگر'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const id = 'google-maps-js';
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps) resolve(window.google);
        else reject(new Error('Google Maps بارگذاری نشد'));
      });
      existing.addEventListener('error', () => reject(new Error('خطا در بارگذاری Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=fa&region=IR`;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps بارگذاری نشد'));
    };
    script.onerror = () => reject(new Error('خطا در بارگذاری Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
