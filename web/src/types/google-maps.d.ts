/** حداقل تایپ برای Maps JavaScript API */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(z: number): void;
    addListener(event: string, fn: (e: MapMouseEvent) => void): MapsEventListener;
  }
  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latLng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng | null | undefined;
    addListener(event: string, fn: () => void): MapsEventListener;
  }
  class Geocoder {
    geocode(
      req: GeocoderRequest,
      cb: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
    ): void;
  }
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }
  interface MapMouseEvent {
    latLng: LatLng | null;
  }
  interface MarkerOptions {
    map?: Map;
    position?: LatLngLiteral;
    draggable?: boolean;
    title?: string;
  }
  interface MapsEventListener {
    remove(): void;
  }
  interface GeocoderRequest {
    address?: string;
    location?: LatLng;
  }
  interface GeocoderResult {
    geometry: { location: LatLng };
  }
  type GeocoderStatus = string;

  namespace places {
    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      addListener(event: string, fn: () => void): google.maps.MapsEventListener;
      getPlace(): PlaceResult;
    }
    interface AutocompleteOptions {
      fields?: string[];
      componentRestrictions?: { country: string | string[] };
    }
    interface PlaceResult {
      geometry?: { location?: LatLng };
      formatted_address?: string;
    }
  }
}

interface Window {
  google?: typeof google;
}

declare const google: {
  maps: typeof google.maps;
};
