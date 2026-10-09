import { apiFetch } from '@/lib/fetch-api';
import {
  createDemoPitch,
  deleteDemoPitch,
  loadDemoPitches,
  moveDemoPitch,
  saveDemoPitches,
  upsertDemoPitch,
} from '@/lib/demo-pitches';
import { isDemoFrontend } from '@/lib/demo';
import type { Pitch } from '@/lib/pitch-types';

export async function fetchAllPitches(): Promise<Pitch[]> {
  if (isDemoFrontend()) return loadDemoPitches();
  const d = await apiFetch<{ success: boolean; pitches: Pitch[] }>('/pitches?all=1');
  if (!d.success) throw new Error('خطا در بارگذاری زمین‌ها');
  return d.pitches;
}

export async function fetchPitch(id: string): Promise<Pitch> {
  if (isDemoFrontend()) {
    const p = loadDemoPitches().find((x) => x._id === id);
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
  if (isDemoFrontend()) {
    const cur = loadDemoPitches().find((p) => p._id === id);
    if (!cur) throw new Error('زمین پیدا نشد');
    const next = { ...cur, ...body, _id: id };
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
  /* API reorder not implemented — demo only */
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
