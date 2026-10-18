import { apiFetch } from '@/lib/fetch-api';

export type ReservationVerifyPayload = {
  code: string;
  pitchName: string;
  pitchAddress: string;
  pitchType?: string;
  date: string;
  slotTime: string;
  amount: number;
  bookerName?: string;
  bookerPhoneMasked?: string;
  status: string;
  bookingStatus?: string;
  paymentStatus?: string;
  valid: boolean;
  checkedIn: boolean;
};

export async function fetchReservationVerify(
  code: string,
): Promise<ReservationVerifyPayload | null> {
  const c = code.trim();
  if (!c || c === '—') return null;
  try {
    const data = await apiFetch<{
      success: boolean;
      verify?: ReservationVerifyPayload;
    }>(`/reservations/verify/${encodeURIComponent(c)}`);
    if (!data.success || !data.verify) return null;
    return data.verify;
  } catch {
    return null;
  }
}
