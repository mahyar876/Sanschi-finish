import { apiFetch } from '@/lib/fetch-api';

export type OwnerDashboardStats = {
  pitchName: string;
  today: string;
  todayCount: number;
  futureCount: number;
  revenueToday: number;
  revenueMonth: number;
  emptySlots: number;
  emptySoon: number;
  pending: number;
  lastMinuteEnabled: boolean;
};

export type OwnerDailySlot = {
  slotIndex: number;
  time: string;
  price: number;
  state: 'free' | 'reserved' | 'pending' | 'blocked' | 'past';
  blocked: boolean;
  reservationCode: string | null;
  customerName: string | null;
  customerPhone: string | null;
  flashEligible: boolean;
  hoursUntil: number | null;
};

export type OwnerCustomerRow = {
  userId: string | null;
  name: string;
  phone: string;
  count: number;
  total: number;
  lastDate: string;
  tag: 'vip' | 'blocked' | 'none';
  note: string;
};

export type OwnerReportsSummary = {
  paidCount: number;
  totalRevenue: number;
  topSlots: { slotTime: string; count: number; revenue: number }[];
  byWeekday: { weekday: string; count: number; revenue: number }[];
};

export async function fetchOwnerDashboard(pitchId: string) {
  return apiFetch<{ success: boolean; stats: OwnerDashboardStats }>(
    `/owner/pitches/${pitchId}/dashboard`,
  );
}

export async function fetchOwnerDaily(pitchId: string, date: string) {
  return apiFetch<{ success: boolean; date: string; slots: OwnerDailySlot[] }>(
    `/owner/pitches/${pitchId}/daily?date=${encodeURIComponent(date)}`,
  );
}

export async function fetchOwnerCustomers(pitchId: string) {
  return apiFetch<{ success: boolean; customers: OwnerCustomerRow[] }>(
    `/owner/pitches/${pitchId}/customers`,
  );
}

export async function fetchOwnerReports(pitchId: string) {
  return apiFetch<{ success: boolean; summary: OwnerReportsSummary }>(
    `/owner/pitches/${pitchId}/reports`,
  );
}

export async function patchOwnerSlotBlock(
  pitchId: string,
  body: { date: string; slotIndex: number; blocked: boolean },
) {
  return apiFetch<{ success: boolean; message: string }>(
    `/owner/pitches/${pitchId}/slots/block`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export async function postOwnerManualReservation(
  pitchId: string,
  body: {
    date: string;
    slotIndex: number;
    customerName: string;
    customerPhone: string;
    note?: string;
    amountOverride?: number;
  },
) {
  return apiFetch<{
    success: boolean;
    message: string;
    reservation: { code: string; _id: string };
  }>(`/owner/pitches/${pitchId}/reservations/manual`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchOwnerCustomerTag(
  pitchId: string,
  phone: string,
  body: { tag: 'vip' | 'blocked' | 'none'; note?: string },
) {
  return apiFetch<{ success: boolean; tag: string; note: string }>(
    `/owner/pitches/${pitchId}/customers/${encodeURIComponent(phone)}/tag`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export async function patchOwnerLastMinute(pitchId: string, enabled: boolean) {
  return apiFetch<{ success: boolean; lastMinuteEnabled: boolean }>(
    `/owner/pitches/${pitchId}/last-minute`,
    { method: 'PATCH', body: JSON.stringify({ enabled }) },
  );
}
