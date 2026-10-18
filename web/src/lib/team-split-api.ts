import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import {
  loadDraftForReservation,
  loadStoredPayInfo,
  loadStoredTeamSplitDraft,
  saveDraftForReservation,
  teamSplitDraftHasContent,
  type GroupChecklistItem,
  type GroupPayInfo,
  type GroupSplitSharePayload,
} from '@/lib/group-split-share';

export type TeamSplitData = {
  players: number;
  checklist: GroupChecklistItem[];
  pay?: GroupPayInfo;
};

const DEMO_KEY = 'sanschii_demo_team_split';

function demoRead(): Record<string, TeamSplitData> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}') as Record<
      string,
      TeamSplitData
    >;
  } catch {
    return {};
  }
}

function demoWrite(map: Record<string, TeamSplitData>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_KEY, JSON.stringify(map));
}

export async function loadTeamSplitForReservation(
  reservationId: string,
): Promise<TeamSplitData | null> {
  if (!reservationId) return null;
  if (isDemoFrontend() || reservationId.startsWith('mock-')) {
    return demoRead()[reservationId] ?? null;
  }
  try {
    const data = await apiFetch<{
      success: boolean;
      reservation?: {
        teamSplit?: {
          players?: number;
          checklist?: GroupChecklistItem[];
          pay?: GroupPayInfo;
        };
        playerCount?: number;
      };
    }>(`/reservations/${reservationId}`);
    const ts = data.reservation?.teamSplit;
    if (!data.success || !ts) return null;
    const checklist = Array.isArray(ts.checklist) ? ts.checklist : [];
    if (!checklist.length && ts.players == null && !ts.pay) return null;
    const pay = ts.pay;
    const hasPay =
      pay && (pay.cardNumber || pay.sheba || pay.accountName || pay.note);
    return {
      players: ts.players ?? data.reservation?.playerCount ?? 10,
      checklist,
      pay: hasPay ? pay : undefined,
    };
  } catch {
    return null;
  }
}

function checklistForServer(draft: {
  players: number | null;
  checklist: GroupChecklistItem[];
}): GroupChecklistItem[] {
  const withNames = draft.checklist.filter((c) => c.name.trim());
  if (withNames.length) return withNames;
  return draft.checklist.filter((c) => c.settled);
}

/** پیش‌نویس مرحلهٔ تأیید/پرداخت (localStorage) → روی رزرو */
export async function syncStoredTeamSplitToReservation(
  reservationId: string,
  pitchName: string,
  date: string,
  time: string,
  pitchId?: string,
  liveDraft?: {
    players: number;
    checklist: GroupChecklistItem[];
    pay?: GroupPayInfo;
  },
): Promise<void> {
  if (!reservationId) return;
  const draft =
    liveDraft != null
      ? { players: liveDraft.players, checklist: liveDraft.checklist }
      : loadStoredTeamSplitDraft(pitchName, date, time, pitchId);
  const pay =
    liveDraft?.pay && typeof liveDraft.pay === 'object'
      ? liveDraft.pay
      : loadStoredPayInfo();
  if (!teamSplitDraftHasContent(draft, pay) && !liveDraft) return;

  const checklist = checklistForServer({
    players: draft.players,
    checklist: draft.checklist,
  });
  const hasPay =
    pay.cardNumber || pay.sheba || pay.accountName || pay.note;

  await saveTeamSplitForReservation(reservationId, {
    players: draft.players ?? 10,
    checklist,
    pay: hasPay ? pay : undefined,
  });
  saveDraftForReservation(reservationId, {
    players: draft.players ?? 10,
    checklist,
  });
}

/** همان sync با state زندهٔ فرم (تیک «زده» از دست نرود) */
export async function pushTeamSplitLiveDraftToReservation(
  reservationId: string,
  draft: { players: number; checklist: GroupChecklistItem[]; pay?: GroupPayInfo },
  pitchName: string,
  date: string,
  time: string,
  pitchId?: string,
): Promise<void> {
  await syncStoredTeamSplitToReservation(
    reservationId,
    pitchName,
    date,
    time,
    pitchId,
    draft,
  );
}

export async function saveTeamSplitForReservation(
  reservationId: string,
  body: TeamSplitData,
): Promise<void> {
  if (!reservationId) return;
  if (isDemoFrontend() || reservationId.startsWith('mock-')) {
    const map = demoRead();
    map[reservationId] = body;
    demoWrite(map);
    saveDraftForReservation(reservationId, {
      players: body.players,
      checklist: body.checklist,
    });
    return;
  }
  await apiFetch(`/reservations/${reservationId}/team-split`, {
    method: 'PATCH',
    body: JSON.stringify({
      players: body.players,
      checklist: body.checklist,
      pay: body.pay ?? {
        cardNumber: '',
        sheba: '',
        accountName: '',
        note: '',
      },
    }),
  });
  saveDraftForReservation(reservationId, {
    players: body.players,
    checklist: body.checklist,
  });
}

export async function fetchTeamShareByCode(
  code: string,
): Promise<GroupSplitSharePayload | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  try {
    const data = await apiFetch<{
      success: boolean;
      share?: GroupSplitSharePayload & TeamSplitData;
    }>(`/reservations/share/${encodeURIComponent(c)}`);
    if (!data.success || !data.share) return null;
    const s = data.share;
    return {
      pitchName: s.pitchName,
      date: s.date,
      time: s.time,
      amount: s.amount,
      players: s.players,
      bookerName: s.bookerName,
      reservationCode: s.reservationCode || c,
      checklist: s.checklist?.length ? s.checklist : undefined,
      pay: s.pay,
    };
  } catch {
    return null;
  }
}
