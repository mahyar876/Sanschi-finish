import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { pushDemoNotification } from '@/lib/demo-notifications';
import { getToken, getUser } from '@/lib/session';
import { createDemoPitch, loadDemoPitches, upsertDemoPitch } from '@/lib/demo-pitches';
import type { TehranZone } from '@/lib/tehran-zones';

export type OwnerApplicationStatus =
  | 'pending'
  | 'approved'
  | 'approved_awaiting_signup'
  | 'rejected'
  | 'needs_revision';

export type OwnerApplication = {
  _id: string;
  contactName: string;
  phone: string;
  email?: string;
  venueName: string;
  venueType: 'futsal' | 'grass';
  size: 5 | 7 | 11;
  address: string;
  tehranZone?: TehranZone | '';
  basePrice: number;
  description?: string;
  status: OwnerApplicationStatus;
  adminNote?: string;
  rejectReason?: string;
  revisionNote?: string;
  pitch?: { _id: string; name?: string; isActive?: boolean } | string | null;
  createdAt?: string;
  reviewedAt?: string;
};

export type OwnerApplicationInput = {
  contactName: string;
  phone: string;
  email?: string;
  venueName: string;
  venueType: 'futsal' | 'grass';
  size: 5 | 7 | 11;
  address: string;
  tehranZone?: TehranZone | '';
  basePrice: number;
  description?: string;
};

const DEMO_KEY = 'sanschi_owner_applications';

function loadDemoApps(): OwnerApplication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as OwnerApplication[]) : [];
  } catch {
    return [];
  }
}

function saveDemoApps(list: OwnerApplication[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(list));
}

export async function submitOwnerApplication(
  input: OwnerApplicationInput,
): Promise<{ message: string }> {
  if (isDemoFrontend()) {
    const list = loadDemoApps();
    if (list.some((a) => a.phone === input.phone && a.status === 'pending')) {
      throw new Error('یک درخواست در انتظار بررسی برای این شماره دارید');
    }
    const fixIdx = list.findIndex(
      (a) => a.phone === input.phone && a.status === 'needs_revision',
    );
    if (fixIdx >= 0) {
      const updated: OwnerApplication = {
        ...list[fixIdx],
        ...input,
        status: 'pending',
        revisionNote: '',
        rejectReason: '',
        reviewedAt: undefined,
      };
      const next = [...list];
      next[fixIdx] = updated;
      saveDemoApps(next);
      return { message: 'درخواست اصلاح‌شده ثبت شد و دوباره در صف بررسی است.' };
    }
    const row: OwnerApplication = {
      _id: `app-${Date.now()}`,
      ...input,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    saveDemoApps([row, ...list]);
    return { message: 'درخواست شما ثبت شد. پس از بررسی، با شما تماس می‌گیریم.' };
  }
  const data = await apiFetch<{ success: boolean; message: string }>(
    '/owner-applications',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return { message: data.message };
}

/** آخرین درخواست همکاری برای کاربر لاگین‌شده (همان شماره موبایل) */
export async function fetchMyOwnerApplication(): Promise<OwnerApplication | null> {
  const phone = getUser()?.phone;
  if (!phone) return null;

  if (isDemoFrontend()) {
    const list = loadDemoApps().filter((a) => a.phone === phone);
    if (!list.length) return null;
    return list.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )[0];
  }
  if (!getToken()) return null;
  const data = await apiFetch<{ success: boolean; application: OwnerApplication | null }>(
    '/owner-applications/mine',
  );
  return data.application;
}

export async function fetchOwnerApplications(
  status: 'pending' | 'all' = 'pending',
): Promise<OwnerApplication[]> {
  if (isDemoFrontend()) {
    const list = loadDemoApps();
    return status === 'all' ? list : list.filter((a) => a.status === 'pending');
  }
  // live API
  const q = status === 'all' ? 'all' : 'pending';
  const data = await apiFetch<{ success: boolean; applications: OwnerApplication[] }>(
    `/owner-applications?status=${q}`,
  );
  return data.applications;
}

export async function approveOwnerApplication(id: string, adminNote = '') {
  if (isDemoFrontend()) {
    const list = loadDemoApps();
    const app = list.find((a) => a._id === id);
    if (!app || app.status !== 'pending') throw new Error('درخواست معتبر نیست');

    const pitch = createDemoPitch({
      name: app.venueName,
      type: app.venueType,
      size: app.size,
      price: app.basePrice,
      address: app.address,
      desc: app.description,
      tags: [],
      isActive: true,
      commissionAmount: 45_000,
    });
    upsertDemoPitch({
      ...pitch,
      owner: { _id: app.phone, name: app.contactName, phone: app.phone },
    });

    app.status = 'approved';
    app.pitch = pitch._id;
    app.adminNote = adminNote;
    app.reviewedAt = new Date().toISOString();
    saveDemoApps(list.map((a) => (a._id === id ? app : a)));
    return {
      message: `زمین «${app.venueName}» در دمو تأیید شد. مالک: ${app.phone}`,
    };
  }
  const data = await apiFetch<{ success: boolean; message: string }>(
    `/owner-applications/${id}/approve`,
    { method: 'PATCH', body: JSON.stringify({ adminNote }) },
  );
  return { message: data.message };
}

export async function rejectOwnerApplication(id: string, rejectReason = '') {
  if (isDemoFrontend()) {
    const list = loadDemoApps();
    saveDemoApps(
      list.map((a) =>
        a._id === id && a.status === 'pending'
          ? {
              ...a,
              status: 'rejected' as const,
              rejectReason,
              reviewedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    return { message: 'درخواست رد شد' };
  }
  const data = await apiFetch<{ success: boolean; message: string }>(
    `/owner-applications/${id}/reject`,
    { method: 'PATCH', body: JSON.stringify({ rejectReason }) },
  );
  return { message: data.message };
}

export async function requestOwnerApplicationRevision(id: string, revisionNote: string) {
  const note = revisionNote.trim();
  if (note.length < 10) {
    throw new Error('توضیح اصلاحات را حداقل در ۱۰ کاراکتر بنویسید');
  }
  if (isDemoFrontend()) {
    const list = loadDemoApps();
    const app = list.find((a) => a._id === id);
    if (!app || app.status !== 'pending') throw new Error('درخواست معتبر نیست');
    app.status = 'needs_revision';
    app.revisionNote = note;
    app.reviewedAt = new Date().toISOString();
    saveDemoApps(list.map((a) => (a._id === id ? app : a)));
    pushDemoNotification({
      title: 'نیاز به اصلاح درخواست همکاری',
      body: `برای «${app.venueName}»: ${note}`,
      type: 'partner_needs_revision',
    });
    return { message: 'درخواست برای اصلاح به متقاضی اعلام شد.' };
  }
  const data = await apiFetch<{ success: boolean; message: string }>(
    `/owner-applications/${id}/revision`,
    { method: 'PATCH', body: JSON.stringify({ revisionNote: note }) },
  );
  return { message: data.message };
}

export const APPLICATION_STATUS_LABEL: Record<OwnerApplicationStatus, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  approved_awaiting_signup: 'تأیید — منتظر ثبت‌نام مالک',
  rejected: 'رد شده',
  needs_revision: 'نیاز به اصلاح',
};
