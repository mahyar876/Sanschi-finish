import { apiFetch } from '@/lib/fetch-api';
import { getToken, getUser } from '@/lib/session';

const KEY_PREFIX = 'sanschii_favorites';
export const PENDING_FAVORITE_KEY = 'sanschii_pending_favorite';
export const FAVORITES_CHANGED_EVENT = 'sanschii-favorites-changed';

let memoryIds: string[] | null = null;

function storageKey(): string {
  const uid = getUser()?.id;
  return uid ? `${KEY_PREFIX}_${uid}` : `${KEY_PREFIX}_guest`;
}

function readLocal(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(), JSON.stringify(ids));
  memoryIds = [...ids];
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

function currentIds(): string[] {
  if (memoryIds) return memoryIds;
  memoryIds = readLocal();
  return memoryIds;
}

export function subscribeFavorites(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onChange();
  window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
  return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
}

export function loadFavoritePitchIds(): string[] {
  return [...currentIds()];
}

export function isFavoritePitch(pitchId: string): boolean {
  return currentIds().includes(pitchId);
}

export async function syncFavoritesFromServer(): Promise<string[]> {
  if (!getToken()) {
    memoryIds = readLocal();
    return [...memoryIds];
  }
  try {
    const data = await apiFetch<{ success: boolean; pitchIds: string[] }>('/api/favorites');
    if (data.success && Array.isArray(data.pitchIds)) {
      writeLocal(data.pitchIds);
      return data.pitchIds;
    }
  } catch {
    memoryIds = readLocal();
  }
  return [...currentIds()];
}

export async function toggleFavoritePitch(pitchId: string): Promise<boolean> {
  if (getToken()) {
    const data = await apiFetch<{
      success: boolean;
      favorited: boolean;
      pitchIds: string[];
    }>(`/api/favorites/${encodeURIComponent(pitchId)}/toggle`, { method: 'POST' });
    if (data.success && Array.isArray(data.pitchIds)) {
      writeLocal(data.pitchIds);
      return data.favorited;
    }
    return isFavoritePitch(pitchId);
  }

  const set = new Set(currentIds());
  if (set.has(pitchId)) set.delete(pitchId);
  else set.add(pitchId);
  const next = [...set];
  writeLocal(next);
  return next.includes(pitchId);
}

/** بعد از ورود / ثبت‌نام — علاقه‌مندی معلق (کلیک روی قلب قبل از ورود) */
export async function applyPendingFavoriteAfterLogin(): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending = sessionStorage.getItem(PENDING_FAVORITE_KEY);
  if (!pending) return;
  sessionStorage.removeItem(PENDING_FAVORITE_KEY);
  memoryIds = null;
  try {
    await toggleFavoritePitch(pending);
  } catch {
    /* ignore */
  }
}

export function clearFavoritesMemoryCache() {
  memoryIds = null;
}
