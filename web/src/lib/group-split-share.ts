import { priceFa } from '@/lib/format';
import { displaySlotTime } from '@/lib/slot-time';

export type GroupPayInfo = {
  cardNumber: string;
  sheba: string;
  accountName: string;
  note: string;
};

/** فقط برای پیگیری بین خود تیم — پرداخت سانس از سانس‌چی است */
export type GroupChecklistItem = {
  id: string;
  name: string;
  /** سهم تقریبی را به رزروکننده داده (نقدی/… خارج از اپ) */
  settled: boolean;
};

export type GroupSplitSharePayload = {
  pitchName: string;
  date: string;
  time: string;
  amount: number;
  players: number;
  bookerName?: string;
  reservationCode?: string;
  checklist?: GroupChecklistItem[];
  pay?: GroupPayInfo;
};

const CHECKLIST_STORAGE_KEY = 'sanschii-group-split-checklist';
const PAY_INFO_STORAGE_KEY = 'sanschii-group-split-payinfo';

function toBase64Url(json: string): string {
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(b64)));
}

export function perPersonShare(total: number, players: number): number {
  if (total <= 0 || players < 2) return 0;
  return Math.ceil(total / players);
}

export function formatCardDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function normalizeCardInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16);
}

export function normalizeShebaInput(raw: string): string {
  const up = raw.toUpperCase().replace(/\s/g, '');
  if (!up) return '';
  if (up.startsWith('IR')) return up.slice(0, 26);
  const digits = up.replace(/\D/g, '').slice(0, 24);
  return digits ? `IR${digits}` : '';
}

function normalizePay(raw: unknown): GroupPayInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<GroupPayInfo>;
  const pay: GroupPayInfo = {
    cardNumber: normalizeCardInput(o.cardNumber || ''),
    sheba: normalizeShebaInput(o.sheba || ''),
    accountName: String(o.accountName || '').trim(),
    note: String(o.note || '').trim(),
  };
  if (!pay.cardNumber && !pay.sheba && !pay.accountName && !pay.note) return undefined;
  return pay;
}

export function loadStoredPayInfo(): GroupPayInfo {
  if (typeof window === 'undefined') {
    return { cardNumber: '', sheba: '', accountName: '', note: '' };
  }
  try {
    const raw = localStorage.getItem(PAY_INFO_STORAGE_KEY);
    if (!raw) return { cardNumber: '', sheba: '', accountName: '', note: '' };
    const parsed = normalizePay(JSON.parse(raw));
    return (
      parsed ?? {
        cardNumber: '',
        sheba: '',
        accountName: '',
        note: '',
      }
    );
  } catch {
    return { cardNumber: '', sheba: '', accountName: '', note: '' };
  }
}

export function saveStoredPayInfo(info: GroupPayInfo): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PAY_INFO_STORAGE_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

export function checklistProgress(items: GroupChecklistItem[]) {
  const total = items.length;
  const done = items.filter((i) => i.settled).length;
  return { done, total, remaining: Math.max(0, total - done) };
}

export function newChecklistItem(name: string): GroupChecklistItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    settled: false,
  };
}

export function buildChecklistForPlayerCount(
  count: number,
  existing: GroupChecklistItem[],
): GroupChecklistItem[] {
  const n = Math.min(22, Math.max(2, count));
  const out: GroupChecklistItem[] = [];
  for (let i = 0; i < n; i++) {
    const prev = existing[i];
    out.push(
      prev
        ? { ...prev, name: prev.name || `نفر ${i + 1}` }
        : newChecklistItem(`نفر ${i + 1}`),
    );
  }
  return out;
}

const RESERVATION_DRAFT_KEY = 'sanschii-team-split-by-reservation';

function checklistStorageKeyByName(pitchName: string, date: string, time: string) {
  return `name:${pitchName}|${date}|${time}`;
}

function checklistStorageKeyByPitchId(pitchId: string, date: string, time: string) {
  return `id:${pitchId}|${date}|${time}`;
}

export function teamSplitDraftLookupKeys(
  pitchName: string,
  date: string,
  time: string,
  pitchId?: string,
): string[] {
  const keys: string[] = [];
  if (pitchId) keys.push(checklistStorageKeyByPitchId(pitchId, date, time));
  if (pitchName) keys.push(checklistStorageKeyByName(pitchName, date, time));
  return keys;
}

export type TeamSplitDraft = {
  players: number | null;
  checklist: GroupChecklistItem[];
};

function normalizeStoredChecklist(raw: unknown): GroupChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Partial<GroupChecklistItem>;
      return {
        id: String(row.id || newChecklistItem('').id),
        name: String(row.name || '').trim(),
        settled: !!row.settled,
      };
    })
    .filter((item) => item.name || item.settled);
}

function readDraftEntry(raw: unknown): TeamSplitDraft {
  if (Array.isArray(raw)) {
    return { players: null, checklist: normalizeStoredChecklist(raw) };
  }
  if (!raw || typeof raw !== 'object') {
    return { players: null, checklist: [] };
  }
  const o = raw as { players?: unknown; checklist?: unknown };
  const playersN = parseInt(String(o.players ?? ''), 10);
  return {
    players: Number.isFinite(playersN) ? Math.min(22, Math.max(2, playersN)) : null,
    checklist: normalizeStoredChecklist(o.checklist),
  };
}

export function loadStoredTeamSplitDraft(
  pitchName: string,
  date: string,
  time: string,
  pitchId?: string,
): TeamSplitDraft {
  if (typeof window === 'undefined') return { players: null, checklist: [] };
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return { players: null, checklist: [] };
    const map = JSON.parse(raw) as Record<string, unknown>;
    for (const key of teamSplitDraftLookupKeys(pitchName, date, time, pitchId)) {
      const draft = readDraftEntry(map[key]);
      if (teamSplitDraftHasContent(draft)) return draft;
    }
    const legacyKey = `${pitchName}|${date}|${time}`;
    return readDraftEntry(map[legacyKey]);
  } catch {
    return { players: null, checklist: [] };
  }
}

export function saveStoredTeamSplitDraft(
  pitchName: string,
  date: string,
  time: string,
  draft: { players: number; checklist: GroupChecklistItem[] },
  pitchId?: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const payload = {
      players: Math.min(22, Math.max(2, draft.players)),
      checklist: draft.checklist,
    };
    if (pitchId) {
      map[checklistStorageKeyByPitchId(pitchId, date, time)] = payload;
    }
    map[checklistStorageKeyByName(pitchName, date, time)] = payload;
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function saveDraftForReservation(
  reservationId: string,
  draft: { players: number; checklist: GroupChecklistItem[] },
): void {
  if (typeof window === 'undefined' || !reservationId) return;
  try {
    const raw = localStorage.getItem(RESERVATION_DRAFT_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    map[reservationId] = {
      players: Math.min(22, Math.max(2, draft.players)),
      checklist: draft.checklist,
    };
    localStorage.setItem(RESERVATION_DRAFT_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function loadDraftForReservation(reservationId: string): TeamSplitDraft {
  if (typeof window === 'undefined' || !reservationId) {
    return { players: null, checklist: [] };
  }
  try {
    const raw = localStorage.getItem(RESERVATION_DRAFT_KEY);
    if (!raw) return { players: null, checklist: [] };
    const map = JSON.parse(raw) as Record<string, unknown>;
    return readDraftEntry(map[reservationId]);
  } catch {
    return { players: null, checklist: [] };
  }
}

/** اگر سرور settled را از دست داده، از پیش‌نویس محلی همان رزرو/سانس بازیابی می‌شود */
export function mergeChecklistPreferSettled(
  server: GroupChecklistItem[],
  local: GroupChecklistItem[],
): GroupChecklistItem[] {
  if (!server.length) return local;
  if (!local.length) return server;
  const byId = new Map(local.map((i) => [i.id, i]));
  const byName = new Map(local.filter((i) => i.name.trim()).map((i) => [i.name.trim(), i]));
  return server.map((s) => {
    const match = byId.get(s.id) || byName.get(s.name.trim());
    if (!match) return s;
    return { ...s, settled: s.settled || match.settled };
  });
}

export function teamSplitDraftHasContent(draft: TeamSplitDraft, pay?: GroupPayInfo): boolean {
  const named = draft.checklist.some((c) => c.name.trim());
  const settled = draft.checklist.some((c) => c.settled);
  const hasPay =
    !!pay &&
    !!(pay.cardNumber || pay.sheba || pay.accountName || pay.note);
  return named || settled || hasPay || (draft.players != null && draft.players !== 10);
}

export function loadStoredChecklist(
  pitchName: string,
  date: string,
  time: string,
): GroupChecklistItem[] {
  return loadStoredTeamSplitDraft(pitchName, date, time).checklist;
}

export function saveStoredChecklist(
  pitchName: string,
  date: string,
  time: string,
  items: GroupChecklistItem[],
  pitchId?: string,
): void {
  const prev = loadStoredTeamSplitDraft(pitchName, date, time, pitchId);
  saveStoredTeamSplitDraft(
    pitchName,
    date,
    time,
    {
      players: prev.players ?? 10,
      checklist: items,
    },
    pitchId,
  );
}

function normalizeChecklist(raw: unknown): GroupChecklistItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const items = raw
    .map((row) => {
      const o = row as Partial<GroupChecklistItem>;
      const name = String(o.name || '').trim();
      if (!name) return null;
      return {
        id: String(o.id || newChecklistItem(name).id),
        name,
        settled: !!o.settled,
      };
    })
    .filter(Boolean) as GroupChecklistItem[];
  return items.length ? items : undefined;
}

export function encodeSharePayload(data: GroupSplitSharePayload): string {
  return toBase64Url(JSON.stringify(data));
}

export function decodeSharePayload(token: string): GroupSplitSharePayload | null {
  try {
    const json = fromBase64Url(token.trim());
    const data = JSON.parse(json) as GroupSplitSharePayload;
    if (!data.pitchName || !data.date || !data.amount || data.amount < 0) return null;
    const players = Math.min(22, Math.max(2, data.players || 10));
    return {
      ...data,
      players,
      amount: Math.round(data.amount),
      checklist: normalizeChecklist(data.checklist),
      pay: normalizePay(data.pay),
    };
  } catch {
    return null;
  }
}

export function parseShareFromSearchParams(
  search: URLSearchParams,
): GroupSplitSharePayload | null {
  const token = search.get('s');
  if (token) return decodeSharePayload(token);

  const pitchName = search.get('pitchName') || search.get('pitch') || '';
  const date = search.get('date') || '';
  const time = search.get('time') || '';
  const amount = parseInt(search.get('amount') || '0', 10);
  if (!pitchName || !date || amount <= 0) return null;

  const players = Math.min(22, Math.max(2, parseInt(search.get('players') || '10', 10) || 10));
  const pay =
    search.get('card') || search.get('sheba') || search.get('accountName')
      ? normalizePay({
          cardNumber: search.get('card') || '',
          sheba: search.get('sheba') || '',
          accountName: search.get('accountName') || '',
          note: search.get('note') || '',
        })
      : undefined;

  return {
    pitchName,
    date,
    time,
    amount,
    players,
    bookerName: search.get('booker') || search.get('name') || undefined,
    reservationCode: search.get('code') || undefined,
    pay,
  };
}

export function buildShareUrl(payload: GroupSplitSharePayload, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const q = new URLSearchParams({ s: encodeSharePayload(payload) });
  if (payload.reservationCode) {
    q.set('code', payload.reservationCode);
  }
  return `${base}/reserve/share?${q.toString()}`;
}

export function buildShareMessage(payload: GroupSplitSharePayload, link: string): string {
  const per = perPersonShare(payload.amount, payload.players);
  const timeLabel = payload.time ? displaySlotTime(payload.time) : '';
  const lines = [
    `⚽ سهم سانس — ${payload.pitchName}`,
    `📅 ${payload.date}${timeLabel ? ` · ${timeLabel}` : ''}`,
    `💰 جمع ${priceFa(payload.amount)} تومان · ${payload.players} نفر`,
    `👉 سهم هر نفر: ${priceFa(per)} تومان`,
  ];
  if (payload.bookerName) lines.push(`👤 رزروکننده: ${payload.bookerName}`);
  if (payload.reservationCode) lines.push(`🎫 کد رزرو: ${payload.reservationCode}`);
  const pay = payload.pay;
  if (pay?.note?.trim()) lines.push(`📝 ${pay.note.trim()}`);
  lines.push('💡 پرداخت سانس فقط از سانس‌چی — این سهم فقط برای هماهنگی تیم است.');
  const list = payload.checklist;
  if (list?.length) {
    const { done, total } = checklistProgress(list);
    lines.push('', `✅ سهم به رزروکننده: ${done} از ${total}`);
    for (const item of list) {
      lines.push(`${item.settled ? '☑' : '☐'} ${item.name}`);
    }
  }
  lines.push('', '🔗 جزئیات و لینک:', link);
  return lines.join('\n');
}
