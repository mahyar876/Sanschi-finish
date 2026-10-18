const KEY = 'sanschii_favorites';

export function loadFavoritePitchIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavoritePitch(pitchId: string): boolean {
  return loadFavoritePitchIds().includes(pitchId);
}

export function toggleFavoritePitch(pitchId: string): boolean {
  const set = new Set(loadFavoritePitchIds());
  if (set.has(pitchId)) {
    set.delete(pitchId);
  } else {
    set.add(pitchId);
  }
  localStorage.setItem(KEY, JSON.stringify([...set]));
  return set.has(pitchId);
}
