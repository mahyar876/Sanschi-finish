export type DemoReservation = {
  _id: string;
  code: string;
  status: 'pending' | 'paid' | 'cancelled';
  date: string;
  slotTime: string;
  amount: number;
  pitch?: { name: string };
};

const KEY = 'sanschi_demo_reservations';

function read(): DemoReservation[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as DemoReservation[];
  } catch {
    return [];
  }
}

function write(list: DemoReservation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getDemoReservations(): DemoReservation[] {
  return read().filter((r) => r.status !== 'cancelled');
}

/** همه رزروهای کاربر شامل لغوشده — برای پنل بازیکن */
export function getDemoMyReservations(): DemoReservation[] {
  return read();
}

export function upsertDemoReservation(r: DemoReservation) {
  const list = read();
  const i = list.findIndex((x) => x._id === r._id);
  if (i >= 0) list[i] = r;
  else list.unshift(r);
  write(list);
}

export function markDemoReservationPaid(id: string, code: string) {
  const list = read();
  const item = list.find((x) => x._id === id);
  if (item) {
    item.status = 'paid';
    item.code = code;
    write(list);
  }
}

export function addDemoPendingReservation(input: Omit<DemoReservation, 'code' | 'status'>) {
  upsertDemoReservation({
    ...input,
    code: '—',
    status: 'pending',
  });
}

export function cancelDemoReservation(id: string) {
  const list = read();
  const item = list.find((x) => x._id === id);
  if (item) {
    item.status = 'cancelled';
    write(list);
  }
}
