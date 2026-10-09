/** Base URL for browser fetch — empty string = same origin (/api rewritten to Express). */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  let p = path.startsWith('/') ? path : `/${path}`;
  if (!p.startsWith('/api/')) {
    p = `/api${p}`;
  }
  return `${base}${p}`;
}

export function authHeaders(token?: string | null): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}
