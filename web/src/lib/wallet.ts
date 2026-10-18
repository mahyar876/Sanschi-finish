import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { getUser } from '@/lib/session';

const DEMO_BALANCE_KEY = 'sanschii_demo_wallet_balance';
const DEMO_TX_KEY = 'sanschii_demo_wallet_tx';

export type WalletTransaction = {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
  reservation?: { code?: string; date?: string; slotTime?: string; amount?: number };
};

function readDemoBalance(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeDemoBalance(n: number) {
  localStorage.setItem(DEMO_BALANCE_KEY, String(Math.max(0, n)));
}

function readDemoTx(): WalletTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DEMO_TX_KEY) || '[]') as WalletTransaction[];
  } catch {
    return [];
  }
}

function pushDemoTx(tx: Omit<WalletTransaction, '_id' | 'createdAt'>) {
  const list = readDemoTx();
  list.unshift({
    ...tx,
    _id: 'demo-tx-' + Date.now(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(DEMO_TX_KEY, JSON.stringify(list.slice(0, 50)));
}

export async function fetchWalletBalance(): Promise<number> {
  if (isDemoFrontend() || getUser()?.id.startsWith('demo-')) {
    return readDemoBalance();
  }
  const data = await apiFetch<{ success: boolean; balance: number }>('/wallet/me');
  return data.balance ?? 0;
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  if (isDemoFrontend() || getUser()?.id.startsWith('demo-')) {
    return readDemoTx();
  }
  const data = await apiFetch<{ success: boolean; transactions: WalletTransaction[] }>(
    '/wallet/transactions',
  );
  return data.transactions ?? [];
}

export async function topupWalletDemo(amount: number): Promise<number> {
  if (isDemoFrontend() || getUser()?.id.startsWith('demo-')) {
    const next = readDemoBalance() + amount;
    writeDemoBalance(next);
    pushDemoTx({
      type: 'topup',
      amount,
      balanceAfter: next,
      note: 'شارژ نمایشی',
    });
    return next;
  }
  const data = await apiFetch<{ success: boolean; balance: number }>('/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return data.balance;
}

export function debitDemoWallet(amount: number, note: string): number {
  const bal = readDemoBalance();
  if (bal < amount) throw new Error('موجودی کیف پول کافی نیست');
  const next = bal - amount;
  writeDemoBalance(next);
  pushDemoTx({
    type: 'payment',
    amount,
    balanceAfter: next,
    note,
  });
  return next;
}

export function walletTxLabel(type: string): string {
  const map: Record<string, string> = {
    topup: 'شارژ',
    payment: 'پرداخت رزرو',
    refund: 'بازگشت وجه',
    admin_credit: 'اعتبار مدیر',
    admin_debit: 'کسر مدیر',
  };
  return map[type] || type;
}
