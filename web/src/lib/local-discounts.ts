const STORE_KEY = 'sanschii_discounts';

type LocalDiscount = {
  pct: number;
  maxAmount?: number;
  used: boolean;
  exp: number;
};

export function applyLocalDiscountCode(
  code: string,
  orderAmount: number,
): { ok: true; discountAmount: number; percent: number } | { ok: false; message: string } {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, message: 'کد تخفیف را وارد کنید' };
  }
  let store: Record<string, LocalDiscount> = {};
  try {
    store = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Record<
      string,
      LocalDiscount
    >;
  } catch {
    store = {};
  }
  const entry = store[normalized];
  if (!entry || entry.used || Date.now() >= entry.exp) {
    return { ok: false, message: 'کد تخفیف نامعتبر یا منقضی شده است' };
  }
  let discountAmount = Math.round((orderAmount * entry.pct) / 100);
  if (entry.maxAmount != null && entry.maxAmount > 0) {
    discountAmount = Math.min(discountAmount, entry.maxAmount);
  }
  discountAmount = Math.min(discountAmount, orderAmount);
  entry.used = true;
  store[normalized] = entry;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  return { ok: true, discountAmount, percent: entry.pct };
}

export type StoredDiscount = {
  code: string;
  pct: number;
  maxAmount?: number;
  used: boolean;
  exp: number;
};

function readStore(): Record<string, LocalDiscount> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Record<
      string,
      LocalDiscount
    >;
  } catch {
    return {};
  }
}

export function listLocalDiscounts(): StoredDiscount[] {
  if (typeof window === 'undefined') return [];
  const store = readStore();
  return Object.entries(store).map(([code, entry]) => ({
    code,
    pct: entry.pct,
    maxAmount: entry.maxAmount,
    used: entry.used,
    exp: entry.exp,
  }));
}

export function saveLocalDiscountForDemo(
  code: string,
  pct: number,
  maxAmount: number,
) {
  const store = readStore();
  store[code.toUpperCase()] = {
    pct,
    maxAmount,
    used: false,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}
