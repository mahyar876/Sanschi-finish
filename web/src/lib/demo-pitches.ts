import { VENUES } from '@/data/venues';
import type { Pitch } from '@/lib/pitch-types';
import { defaultSlots } from '@/lib/pitch-types';
import { isUsablePitchImage } from '@/lib/venue-images';

const KEY = 'sanschi_demo_pitches';
const STORAGE_VERSION = 3;
const VERSION_KEY = 'sanschi_demo_pitches_v';

function ensureDemoStorageVersion() {
  if (typeof window === 'undefined') return;
  const v = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
  if (v >= STORAGE_VERSION) return;
  localStorage.removeItem(KEY);
  localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
}

function venueToPitch(v: (typeof VENUES)[0], index: number): Pitch {
  return {
    _id: `demo-${v.id}`,
    name: v.name,
    type: v.category === 'grass' ? 'grass' : 'futsal',
    size: v.size,
    price: v.priceFrom,
    address: `${v.address}، ${v.city}`,
    desc: v.seoDescription,
    tags: [...v.tags],
    image: v.image,
    isActive: true,
    commissionAmount: 45_000,
    slots: defaultSlots(v.priceFrom),
    sortOrder: index,
    owner: index === 0 ? { _id: 'demo-owner', name: 'مالک نمایشی', phone: '09121111111' } : null,
    lat: v.lat,
    lng: v.lng,
  };
}

function seed(): Pitch[] {
  return VENUES.map(venueToPitch);
}

export function loadDemoPitches(): Pitch[] {
  const base = seed();
  if (typeof window === 'undefined') return base;
  ensureDemoStorageVersion();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(base));
      return base;
    }
    const saved = JSON.parse(raw) as Pitch[];
    const savedById = new Map(saved.map((p) => [p._id, p]));
    return base.map((b) => {
      const cur = savedById.get(b._id);
      if (!cur) return b;
      return {
        ...b,
        ...cur,
        _id: b._id,
        name: cur.name?.trim() ? cur.name : b.name,
        address: cur.address?.trim() ? cur.address : b.address,
        type: cur.type === 'grass' || cur.type === 'futsal' ? cur.type : b.type,
        image: isUsablePitchImage(cur.image) ? cur.image!.trim() : b.image,
      };
    });
  } catch {
    return base;
  }
}

export function saveDemoPitches(pitches: Pitch[]) {
  localStorage.setItem(KEY, JSON.stringify(pitches));
}

export function upsertDemoPitch(pitch: Pitch) {
  const list = loadDemoPitches();
  const i = list.findIndex((p) => p._id === pitch._id);
  if (i >= 0) list[i] = pitch;
  else list.push(pitch);
  list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  saveDemoPitches(list);
  return list;
}

export function deleteDemoPitch(id: string) {
  const list = loadDemoPitches().filter((p) => p._id !== id);
  saveDemoPitches(list);
  return list;
}

export function createDemoPitch(input: Omit<Pitch, '_id' | 'slots'> & { slots?: Pitch['slots'] }) {
  const list = loadDemoPitches();
  const id = `demo-${Date.now()}`;
  const pitch: Pitch = {
    ...input,
    _id: id,
    slots: input.slots ?? defaultSlots(input.price),
    sortOrder: list.length,
  };
  list.push(pitch);
  saveDemoPitches(list);
  return pitch;
}

export function moveDemoPitch(id: string, dir: -1 | 1) {
  const list = loadDemoPitches();
  const sorted = [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const i = sorted.findIndex((p) => p._id === id);
  if (i < 0) return list;
  const j = i + dir;
  if (j < 0 || j >= sorted.length) return list;
  const a = sorted[i].sortOrder ?? i;
  const b = sorted[j].sortOrder ?? j;
  sorted[i].sortOrder = b;
  sorted[j].sortOrder = a;
  saveDemoPitches(sorted);
  return sorted;
}
