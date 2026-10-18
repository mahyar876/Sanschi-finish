import { VENUES } from '@/data/venues';
import { loadDemoPitches } from '@/lib/demo-pitches';
import type { Pitch } from '@/lib/pitch-types';
import { getDemoReservations } from '@/lib/demo-reservations';

export function getDemoAdminPitches() {
  return VENUES.map((v) => ({
    _id: `demo-${v.id}`,
    name: v.name,
    type: v.category,
    isActive: true,
    commissionAmount: 45_000,
  }));
}

export function getDemoAdminReservations() {
  return getDemoReservations().map((r) => ({
    _id: r._id,
    code: r.code,
    status: r.status,
    amount: r.amount,
    user: { name: 'کاربر نمایشی' },
    pitch: r.pitch,
  }));
}

export function getDemoOwnerPitches(): Pitch[] {
  const ids = new Set(VENUES.slice(0, 3).map((v) => `demo-${v.id}`));
  return loadDemoPitches().filter((p) => ids.has(p._id));
}

export function getDemoOwnerReservations() {
  return getDemoReservations().slice(0, 10).map((r) => ({
    _id: r._id,
    code: r.code,
    status: r.status === 'paid' ? 'paid' : r.status,
    date: r.date,
    slotTime: r.slotTime,
    amount: r.amount,
    playerName: 'مهمان',
    playerCount: 5,
  }));
}

export function getDemoFinanceStats() {
  const paid = getDemoReservations().filter((r) => r.status === 'paid');
  const total = paid.reduce((s, r) => s + r.amount, 0);
  return {
    totalRevenue: total,
    paidCount: paid.length,
    pendingCount: getDemoReservations().filter((r) => r.status === 'pending').length,
  };
}

export function getDemoOwnerDashboardStats(pitchId?: string) {
  const reservations = getDemoOwnerReservations();
  const today = '۱۴۰۴/۰۷/۱۷';
  const todayCount = reservations.filter((r) => r.date === today).length;
  const pending = reservations.filter((r) => r.status === 'pending').length;
  const paid = reservations.filter((r) => r.status === 'paid');
  const revenueToday = paid.filter((r) => r.date === today).reduce((s, r) => s + r.amount, 0);
  const revenueMonth = paid.reduce((s, r) => s + r.amount, 0);
  const future = reservations.filter((r) => r.status !== 'cancelled').length;

  let emptySlots = 8;
  if (pitchId) {
    const pitch = loadDemoPitches().find((p) => p._id === pitchId);
    if (pitch) {
      emptySlots = pitch.slots.filter((s) => !s.taken).length;
    }
  }

  return {
    todayCount,
    futureCount: future,
    revenueToday,
    revenueMonth,
    emptySlots,
    emptySoon: Math.min(3, emptySlots),
    pending,
    pitchName: pitchId ? undefined : getDemoOwnerPitches()[0]?.name,
  };
}

export function getDemoOwnerCustomers() {
  const seen = new Map<string, { name: string; phone: string; count: number; total: number }>();
  getDemoOwnerReservations().forEach((r) => {
    const key = r.playerName || 'مهمان';
    const cur = seen.get(key) || { name: key, phone: '09120000000', count: 0, total: 0 };
    cur.count += 1;
    if (r.status === 'paid') cur.total += r.amount;
    seen.set(key, cur);
  });
  return [...seen.values()];
}

export function getDemoSettlements() {
  const pitch = VENUES[0]?.name || 'مجموعه نمایشی';
  return [
    {
      _id: 'demo-set-1',
      date: '۱۴۰۴/۰۷/۰۱',
      grossAmount: 3_500_000,
      commissionAmount: 175_000,
      netAmount: 3_325_000,
      status: 'pending',
      pitch: { name: pitch },
    },
  ];
}
