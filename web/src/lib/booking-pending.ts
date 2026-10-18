const KEY = 'sanschii_booking_pending';

export type PendingBooking = {
  pitchId: string;
  pitchName: string;
  slotIndex: number;
  slotTime: string;
  date: string;
  name: string;
  phone: string;
};

export function savePendingBooking(data: PendingBooking) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function loadPendingBooking(): PendingBooking | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingBooking;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
