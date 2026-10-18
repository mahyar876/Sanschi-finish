import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { loadDemoPitches } from '@/lib/demo-pitches';
import { getToken } from '@/lib/session';
import { normalizeSheba } from '@/lib/sheba';

export type AdminOwnerPitch = {
  _id: string;
  name: string;
  isActive: boolean;
};

export type AdminOwnerRecord = {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  sheba: string;
  role: string;
  createdAt?: string;
  pitches: AdminOwnerPitch[];
};

export type AdminOwnersPayload = {
  owners: AdminOwnerRecord[];
  unassignedPitches: AdminOwnerPitch[];
};

export type AssignOwnerInput = {
  phone: string;
  firstName?: string;
  lastName?: string;
  sheba?: string;
  email?: string;
  createIfMissing?: boolean;
};

function demoOwnersPayload(): AdminOwnersPayload {
  const pitches = loadDemoPitches();
  const map = new Map<string, AdminOwnerRecord>();
  for (const p of pitches) {
    if (!p.owner?._id) continue;
    const id = p.owner._id;
    if (!map.has(id)) {
      map.set(id, {
        _id: id,
        name: p.owner.name || 'مالک',
        firstName: '',
        lastName: '',
        phone: p.owner.phone || id,
        email: '',
        sheba: '',
        role: 'owner',
        pitches: [],
      });
    }
    map.get(id)!.pitches.push({ _id: p._id, name: p.name, isActive: p.isActive });
  }
  return {
    owners: [...map.values()],
    unassignedPitches: pitches
      .filter((p) => !p.owner)
      .map((p) => ({ _id: p._id, name: p.name, isActive: p.isActive })),
  };
}

export async function fetchAdminOwners(): Promise<AdminOwnersPayload> {
  if (isDemoFrontend() || getToken()?.startsWith('demo-token')) {
    return demoOwnersPayload();
  }
  const data = await apiFetch<{
    success: boolean;
    owners: AdminOwnerRecord[];
    unassignedPitches: AdminOwnerPitch[];
  }>('/admin/owners');
  if (!data.success) throw new Error('بارگذاری مالک‌ها ناموفق بود');
  return { owners: data.owners, unassignedPitches: data.unassignedPitches };
}

export async function updateAdminOwner(
  userId: string,
  patch: Partial<Pick<AdminOwnerRecord, 'firstName' | 'lastName' | 'phone' | 'email' | 'sheba'>>,
): Promise<AdminOwnerRecord> {
  if (isDemoFrontend() || getToken()?.startsWith('demo-token')) {
    throw new Error('در حالت دمو ویرایش مالک روی سرور انجام نمی‌شود');
  }
  const body = {
    ...patch,
    sheba: patch.sheba ? normalizeSheba(patch.sheba) : patch.sheba,
  };
  const data = await apiFetch<{ success: boolean; owner: AdminOwnerRecord }>(
    `/admin/owners/${userId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  if (!data.success || !data.owner) throw new Error('ذخیره ناموفق بود');
  return data.owner;
}

export async function assignPitchOwnerDetailed(
  pitchId: string,
  input: AssignOwnerInput,
): Promise<void> {
  const { assignPitchOwner } = await import('@/lib/pitch-service');
  if (isDemoFrontend() || getToken()?.startsWith('demo-token')) {
    await assignPitchOwner(pitchId, input.phone);
    return;
  }
  await apiFetch(`/pitches/${pitchId}/assign-owner`, {
    method: 'PATCH',
    body: JSON.stringify({
      phone: input.phone.trim(),
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      sheba: input.sheba ? normalizeSheba(input.sheba) : undefined,
      email: input.email?.trim(),
      createIfMissing: Boolean(input.createIfMissing),
    }),
  });
}

export async function removePitchOwnerApi(pitchId: string): Promise<void> {
  const { assignPitchOwner } = await import('@/lib/pitch-service');
  await assignPitchOwner(pitchId, null);
}
