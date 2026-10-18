import { apiFetch } from '@/lib/fetch-api';
import {
  createDemoPitch,
  deleteDemoPitch,
  loadDemoPitches,
  moveDemoPitch,
  saveDemoPitches,
  upsertDemoPitch,
} from '@/lib/demo-pitches';
import { isDemoFrontend, isDemoPitchId } from '@/lib/demo';
import { getToken } from '@/lib/session';
import type { Pitch } from '@/lib/pitch-types';
import { defaultSlots } from '@/lib/pitch-types';

function preferLocalPitchList(): boolean {
  const token = getToken();
  return isDemoFrontend() || Boolean(token?.startsWith('demo-token'));
}

function preferLocalPitchUpdate(id: string): boolean {
  return isDemoFrontend() || (preferLocalPitchList() && isDemoPitchId(id));
}

function pitchIdOf(p: { _id?: string; id?: string }): string {
  return String(p._id ?? p.id ?? '');
}

function normalizeOwnerPitch(raw: Partial<Pitch> & { id?: string }): Pitch {
  const _id = pitchIdOf(raw);
  const price = raw.price ?? 550_000;
  const slots =
    raw.slots && raw.slots.length > 0 ? raw.slots : defaultSlots(price);
  return {
    name: raw.name ?? 'مجموعه',
    type: raw.type ?? 'futsal',
    size: raw.size ?? 5,
    price,
    address: raw.address ?? '',
    desc: raw.desc,
    rulesText: raw.rulesText,
    amenities: raw.amenities ?? [],
    maxCapacity: raw.maxCapacity ?? null,
    tags: raw.tags ?? [],
    image: raw.image,
    isActive: raw.isActive ?? true,
    womenBookingAllowed: raw.womenBookingAllowed ?? null,
    commissionAmount: raw.commissionAmount ?? 0,
    slots,
    lat: raw.lat,
    lng: raw.lng,
    lastMinuteEnabled: raw.lastMinuteEnabled,
    lastMinuteDiscount60: raw.lastMinuteDiscount60,
    lastMinuteDiscount30: raw.lastMinuteDiscount30,
    lastMinuteMaxPct: raw.lastMinuteMaxPct,
    owner: raw.owner,
    _id,
  };
}

/** بارگذاری زمین برای پنل مالک — لیست API، دمو، یا /pitches/:id */
export async function fetchPitchForOwner(id: string): Promise<Pitch | null> {
  const sid = String(id);
  if (!sid) return null;

  if (preferLocalPitchList() || isDemoPitchId(sid)) {
    const local = loadDemoPitches().find((x) => pitchIdOf(x) === sid);
    if (local) return local;
  }

  try {
    const list = await apiFetch<{ success: boolean; pitches: Pitch[] }>('/owner/pitches');
    if (list.success && list.pitches?.length) {
      const hit = list.pitches.find((p) => pitchIdOf(p) === sid);
      if (hit) return normalizeOwnerPitch(hit);
    }
  } catch {
    /* token نمایشی یا آفلاین */
  }

  if (preferLocalPitchList()) {
    const local = loadDemoPitches().find((x) => pitchIdOf(x) === sid);
    if (local) return local;
  }

  try {
    return await fetchPitch(sid);
  } catch {
    return null;
  }
}

export async function fetchAllPitches(): Promise<Pitch[]> {
  if (preferLocalPitchList()) return loadDemoPitches();
  const d = await apiFetch<{ success: boolean; pitches: Pitch[] }>('/pitches?all=1');
  if (!d.success) throw new Error('خطا در بارگذاری زمین‌ها');
  return d.pitches;
}

export async function fetchPitch(id: string): Promise<Pitch> {
  if (isDemoFrontend() || (preferLocalPitchList() && isDemoPitchId(id))) {
    const p = loadDemoPitches().find((x) => pitchIdOf(x) === String(id));
    if (!p) throw new Error('زمین پیدا نشد');
    return p;
  }
  const d = await apiFetch<{ success: boolean; pitch: Pitch }>(`/pitches/${id}`);
  if (!d.success) throw new Error('زمین پیدا نشد');
  return d.pitch;
}

export async function createPitch(body: Partial<Pitch>): Promise<Pitch> {
  if (isDemoFrontend()) {
    return createDemoPitch({
      name: body.name || 'زمین جدید',
      type: body.type || 'futsal',
      size: body.size || 5,
      price: body.price || 550_000,
      address: body.address || '',
      desc: body.desc,
      tags: body.tags || [],
      image: body.image,
      isActive: body.isActive ?? true,
      commissionAmount: body.commissionAmount ?? 0,
      lat: body.lat,
      lng: body.lng,
    });
  }
  const d = await apiFetch<{ success: boolean; pitch: Pitch }>('/pitches', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!d.pitch) throw new Error('ثبت زمین ناموفق');
  return d.pitch;
}

export async function updatePitch(id: string, body: Partial<Pitch>): Promise<Pitch> {
  if (preferLocalPitchUpdate(id)) {
    const cur = loadDemoPitches().find((p) => pitchIdOf(p) === String(id));
    if (!cur) throw new Error('زمین پیدا نشد');
    const next = { ...cur, ...body, _id: pitchIdOf(cur) };
    upsertDemoPitch(next);
    return next;
  }
  const d = await apiFetch<{ success: boolean; pitch: Pitch }>(`/pitches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return d.pitch;
}

export async function removePitch(id: string) {
  if (isDemoFrontend()) {
    deleteDemoPitch(id);
    return;
  }
  await apiFetch(`/pitches/${id}`, { method: 'DELETE' });
}

export async function reorderPitch(id: string, dir: -1 | 1) {
  if (isDemoFrontend()) {
    moveDemoPitch(id, dir);
    return;
  }
  await apiFetch(`/pitches/${id}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ dir }),
  });
}

export async function assignPitchOwner(pitchId: string, ownerUserId: string | null) {
  if (isDemoFrontend()) {
    const cur = loadDemoPitches().find((p) => p._id === pitchId);
    if (!cur) return;
    cur.owner = ownerUserId
      ? { _id: ownerUserId, name: 'مالک', phone: ownerUserId }
      : null;
    upsertDemoPitch(cur);
    return;
  }
  if (ownerUserId) {
    await apiFetch(`/pitches/${pitchId}/assign-owner`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: ownerUserId }),
    });
  } else {
    await apiFetch(`/pitches/${pitchId}/remove-owner`, { method: 'DELETE' });
  }
}

export function exportPitchesJson(pitches: Pitch[]) {
  return JSON.stringify(pitches, null, 2);
}

export function persistDemoBatch(pitches: Pitch[]) {
  saveDemoPitches(pitches);
}
