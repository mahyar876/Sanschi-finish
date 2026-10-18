/** پیکربندی کاشی نقشه — قابل تعویض با env بدون بازنویسی کامپوننت‌ها */

export type MapTileConfig = {
  urlTemplate: string;
  attribution: string;
  maxZoom: number;
};

export function getMapTileConfig(): MapTileConfig {
  const custom = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();
  if (custom) {
    return {
      urlTemplate: custom,
      attribution:
        process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() ||
        '&copy; Map data',
      maxZoom: parseInt(process.env.NEXT_PUBLIC_MAP_TILE_MAX_ZOOM || '19', 10) || 19,
    };
  }
  return {
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  };
}

export function attachStandardTileLayer(
  L: typeof import('leaflet'),
  map: import('leaflet').Map,
): void {
  const cfg = getMapTileConfig();
  L.tileLayer(cfg.urlTemplate, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
  }).addTo(map);
}
