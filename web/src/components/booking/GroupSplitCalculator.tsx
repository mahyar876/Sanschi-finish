'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { loadTeamSplitForReservation, saveTeamSplitForReservation } from '@/lib/team-split-api';
import { StepperInput } from '@/components/form/StepperInput';
import { priceFa } from '@/lib/format';
import { numFa } from '@/lib/jalali';
import { displaySlotTime } from '@/lib/slot-time';
import {
  buildChecklistForPlayerCount,
  buildShareMessage,
  buildShareUrl,
  checklistProgress,
  loadDraftForReservation,
  loadStoredTeamSplitDraft,
  loadStoredPayInfo,
  mergeChecklistPreferSettled,
  newChecklistItem,
  perPersonShare,
  saveStoredTeamSplitDraft,
  saveStoredPayInfo,
  type GroupChecklistItem,
  type GroupPayInfo,
  type GroupSplitSharePayload,
} from '@/lib/group-split-share';

const PLAYER_PRESETS = [5, 7, 10, 11, 14] as const;

export type GroupSplitDraftSnapshot = {
  players: number;
  checklist: GroupChecklistItem[];
  pay: GroupPayInfo;
};

export type GroupSplitCalculatorHandle = {
  getDraft: () => GroupSplitDraftSnapshot;
  /** ذخیرهٔ فوری روی رزرو (بعد از ثبت چک‌لیست) */
  saveNow: () => Promise<boolean>;
};

type Props = {
  totalAmount: number;
  pitchName: string;
  pitchId?: string;
  date: string;
  time: string;
  bookerName?: string;
  reservationCode?: string;
  defaultPlayers?: number;
  mode?: 'edit' | 'readonly';
  checklist?: GroupChecklistItem[];
  payInfo?: GroupPayInfo;
  /** با رزرو ذخیره می‌شود — پنل بازیکن و لینk گروه به‌روز می‌ماند */
  reservationId?: string;
  /** رزرو هنوز در سانس‌چی پرداخت نشده — تفکیک از تیک «زده» */
  reservationAwaitingPayment?: boolean;
  onPlayersChange?: (n: number) => void;
};

export const GroupSplitCalculator = forwardRef<GroupSplitCalculatorHandle, Props>(
  function GroupSplitCalculator(
    {
      totalAmount,
      pitchName,
      pitchId,
      date,
      time,
      bookerName,
      reservationCode,
      defaultPlayers = 10,
      mode = 'edit',
      checklist: checklistProp,
      payInfo: payInfoProp,
      reservationId,
      reservationAwaitingPayment = false,
      onPlayersChange,
    },
    ref,
  ) {
  const skipRemoteSaveRef = useRef(true);
  const remoteLoadDoneRef = useRef(!reservationId || mode !== 'edit');
  const saveTimerRef = useRef<number | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle');
  const [players, setPlayers] = useState(() => {
    if (mode === 'readonly') {
      return Math.min(22, Math.max(2, defaultPlayers));
    }
    if (reservationId && mode === 'edit') {
      return Math.min(22, Math.max(2, defaultPlayers));
    }
    const draft = loadStoredTeamSplitDraft(pitchName, date, time, pitchId);
    if (draft.players != null) return draft.players;
    return Math.min(22, Math.max(2, defaultPlayers));
  });
  const [payInfo, setPayInfo] = useState<GroupPayInfo>(() =>
    mode === 'readonly' && payInfoProp ? payInfoProp : loadStoredPayInfo(),
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<GroupChecklistItem[]>(() => {
    if (mode === 'readonly' && checklistProp?.length) return checklistProp;
    if (reservationId && mode === 'edit') return [];
    return loadStoredTeamSplitDraft(pitchName, date, time, pitchId).checklist;
  });
  const [newName, setNewName] = useState('');
  const [shareHint, setShareHint] = useState('');

  const flushRemoteSave = useCallback(async (): Promise<boolean> => {
    if (!reservationId || mode !== 'edit') return false;
    const withNames = checklist.filter((c) => c.name.trim());
    const hasPay = Boolean(payInfo.note?.trim());
    try {
      await saveTeamSplitForReservation(reservationId, {
        players,
        checklist: withNames,
        pay: hasPay ? payInfo : undefined,
      });
      setShareHint('چک‌لیست ثبت شد — در پنل بازیکن و لینک گروه به‌روز است.');
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 4000);
      return true;
    } catch {
      setShareHint('ذخیره روی سرور نشد — اتصال را چک کنید.');
      setSaveState('err');
      return false;
    }
  }, [reservationId, mode, checklist, players, payInfo]);

  useImperativeHandle(
    ref,
    () => ({
      getDraft: () => ({
        players,
        checklist,
        pay: payInfo,
      }),
      saveNow: () => flushRemoteSave(),
    }),
    [players, checklist, payInfo, flushRemoteSave],
  );

  useEffect(() => {
    if (mode === 'readonly') {
      setPlayers(Math.min(22, Math.max(2, defaultPlayers)));
      if (checklistProp?.length) setChecklist(checklistProp);
      if (payInfoProp) setPayInfo(payInfoProp);
    }
  }, [mode, defaultPlayers, checklistProp, payInfoProp]);

  useEffect(() => {
    if (mode === 'edit') {
      saveStoredTeamSplitDraft(pitchName, date, time, { players, checklist }, pitchId);
    }
  }, [checklist, players, mode, pitchName, pitchId, date, time]);

  useEffect(() => {
    if (mode === 'edit') saveStoredPayInfo(payInfo);
  }, [payInfo, mode]);

  useEffect(() => {
    if (!reservationId || mode !== 'edit') return;
    let cancelled = false;
    skipRemoteSaveRef.current = true;
    remoteLoadDoneRef.current = false;
    void loadTeamSplitForReservation(reservationId).then((remote) => {
      if (cancelled) return;
      const slotDraft = loadStoredTeamSplitDraft(pitchName, date, time, pitchId);
      const resDraft = loadDraftForReservation(reservationId);
      const localFallback =
        resDraft.checklist.length > 0 ? resDraft : slotDraft;

      if (remote) {
        const mergedChecklist = remote.checklist.length
          ? mergeChecklistPreferSettled(remote.checklist, localFallback.checklist)
          : localFallback.checklist;
        setPlayers(
          Math.min(
            22,
            Math.max(
              2,
              remote.players ?? localFallback.players ?? defaultPlayers,
            ),
          ),
        );
        if (mergedChecklist.length) setChecklist(mergedChecklist);
        if (remote.pay) {
          setPayInfo({
            cardNumber: remote.pay.cardNumber || '',
            sheba: remote.pay.sheba || '',
            accountName: remote.pay.accountName || '',
            note: remote.pay.note || '',
          });
        }
      } else if (localFallback.checklist.length || localFallback.players != null) {
        if (localFallback.players != null) {
          setPlayers(Math.min(22, Math.max(2, localFallback.players)));
        }
        if (localFallback.checklist.length) setChecklist(localFallback.checklist);
      }

      remoteLoadDoneRef.current = true;
      skipRemoteSaveRef.current = false;
    });
    return () => {
      cancelled = true;
    };
  }, [reservationId, mode, pitchName, pitchId, date, time, defaultPlayers]);

  useEffect(() => {
    if (
      !reservationId ||
      mode !== 'edit' ||
      skipRemoteSaveRef.current ||
      !remoteLoadDoneRef.current
    ) {
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushRemoteSave();
    }, 650);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [reservationId, mode, players, checklist, payInfo, flushRemoteSave]);

  const perPerson = useMemo(
    () => perPersonShare(totalAmount, players),
    [totalAmount, players],
  );

  const progress = useMemo(() => checklistProgress(checklist), [checklist]);

  const payload = useMemo((): GroupSplitSharePayload => {
    const withNames = checklist.filter((c) => c.name.trim());
    const hasPay = Boolean(payInfo.note?.trim());
    return {
      pitchName,
      date,
      time,
      amount: totalAmount,
      players,
      bookerName,
      reservationCode,
      checklist: withNames.length ? withNames : undefined,
      pay: hasPay ? payInfo : undefined,
    };
  }, [
    pitchName,
    date,
    time,
    totalAmount,
    players,
    bookerName,
    reservationCode,
    checklist,
    payInfo,
  ]);

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return buildShareUrl(payload);
  }, [payload]);

  function updatePlayers(n: number) {
    setPlayers(n);
    onPlayersChange?.(n);
  }

  const copyText = useCallback(async (text: string, fieldId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (fieldId) {
        setCopiedField(fieldId);
        window.setTimeout(() => setCopiedField(null), 2000);
      }
    } catch {
      setShareHint('کپی نشد — متن را دستی انتخاب کنید.');
    }
  }, []);

  async function copyShareLink() {
    if (!shareLink) return;
    await copyText(shareLink);
    setShareHint('لینک کپی شد. بعد از تغییر چک‌لیست دوباره بفرستید تا دوستان نسخهٔ جدید ببینند.');
  }

  async function copyFullMessage() {
    if (!shareLink) return;
    await copyText(buildShareMessage(payload, shareLink));
    setShareHint('متن گروه کپی شد.');
  }

  function toggleSettled(id: string) {
    if (mode === 'readonly') return;
    setChecklist((list) =>
      list.map((item) =>
        item.id === id ? { ...item, settled: !item.settled } : item,
      ),
    );
  }

  function updateName(id: string, name: string) {
    setChecklist((list) =>
      list.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  function removeItem(id: string) {
    setChecklist((list) => list.filter((item) => item.id !== id));
  }

  function addPerson() {
    const name = newName.trim() || `نفر ${checklist.length + 1}`;
    setChecklist((list) => [...list, newChecklistItem(name)]);
    setNewName('');
  }

  function seedChecklistFromCount() {
    setChecklist((prev) => buildChecklistForPlayerCount(players, prev));
  }

  if (totalAmount <= 0) return null;

  const timeLabel = time ? displaySlotTime(time) : '';

  return (
    <section
      className={`group-split-card${mode === 'readonly' ? ' group-split-card--readonly' : ''}`}
      aria-labelledby="group-split-title"
    >
      <div className="group-split-card__glow" aria-hidden />
      <header className="group-split-card__head">
        <div>
          <p className="group-split-card__eyebrow">هماهنگی تیم</p>
          <h2 id="group-split-title" className="group-split-card__title">
            {mode === 'readonly' ? 'سهم هر نفر' : 'ماشین‌حساب و چک‌لیست'}
          </h2>
          {mode === 'readonly' ? (
            <p className="group-split-card__meta">
              {pitchName} · {date}
              {timeLabel ? ` · ${timeLabel}` : ''}
            </p>
          ) : (
            <p className="group-split-card__meta muted-sm">
              سانس از سانس‌چی رزرو می‌شود؛ سهم هر نفر و کارت برای واریز بین خودتان است.
            </p>
          )}
        </div>
        <div className="group-split-total-pill" title="مبلغ کل سانس">
          <span className="muted-sm">جمع سانس</span>
          <strong>{priceFa(totalAmount)}</strong>
          <span className="muted-sm">تومان</span>
        </div>
      </header>

      <div className="group-split-hero">
        <p className="group-split-hero__label">سهم تقریبی هر نفر</p>
        <p className="group-split-hero__amount">
          {priceFa(perPerson)}
          <span className="group-split-hero__unit">تومان</span>
        </p>
        <p className="group-split-hero__sub muted-sm">
          برای {numFa(players)} نفر · گرد به بالا
        </p>
      </div>

      {mode === 'edit' ? (
        <>
          <StepperInput
            label="تعداد نفر (برای تقسیم)"
            suffix="نفر"
            min={2}
            max={22}
            value={players}
            onChange={updatePlayers}
          />
          <div className="group-split-presets" role="group" aria-label="تعداد متداول">
            {PLAYER_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={players === n ? 'chip active' : 'chip'}
                onClick={() => updatePlayers(n)}
              >
                {numFa(n)} نفر
              </button>
            ))}
          </div>

          <div className="field group-split-note-field">
            <label htmlFor="split-note">یادداشت برای گروه (اختیاری)</label>
            <input
              id="split-note"
              value={payInfo.note}
              onChange={(e) => setPayInfo((p) => ({ ...p, note: e.target.value }))}
              placeholder="مثلاً ساعت ۱۹ در ورودی"
            />
            <p className="muted-sm group-split-pay__hint">
              پرداخت سانس از سانس‌چی است — این فقط برای هماهنگی بین خود تیم است.
            </p>
          </div>

          <TeamChecklist
            mode="edit"
            checklist={checklist}
            progress={progress}
            bookerName={bookerName}
            newName={newName}
            onNewNameChange={setNewName}
            onToggle={toggleSettled}
            onUpdateName={updateName}
            onRemove={removeItem}
            onAdd={addPerson}
            onSeed={seedChecklistFromCount}
            playerCount={players}
            reservationAwaitingPayment={reservationAwaitingPayment}
          />

          {reservationId ? (
            <div className="group-split-register">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saveState === 'saving'}
                onClick={() => {
                  setSaveState('saving');
                  void flushRemoteSave();
                }}
              >
                {saveState === 'saving'
                  ? 'در حال ثبت…'
                  : saveState === 'saved'
                    ? 'ثبت شد ✓'
                    : 'ثبت چک‌لیست'}
              </button>
              <p className="muted-sm group-split-register__hint">
                بعد از زدن «زده» برای هر نفر، ثبت کنید تا در{' '}
                <strong>پنل بازیکن → رزروهای من</strong> دیده شود.
              </p>
            </div>
          ) : null}

          <div className="group-split-share-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copyShareLink()}>
              کپی لینک برای گروه
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void copyFullMessage()}
            >
              کپی متن (تلگرام / واتساپ)
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="group-split-readonly-facts">
            <div>
              <dt>تعداد نفر</dt>
              <dd>{numFa(players)}</dd>
            </div>
            {bookerName ? (
              <div>
                <dt>رزروکننده</dt>
                <dd>{bookerName}</dd>
              </div>
            ) : null}
            {reservationCode ? (
              <div>
                <dt>کد رزرو</dt>
                <dd>{reservationCode}</dd>
              </div>
            ) : null}
          </dl>

          {payInfo.note?.trim() ? (
            <div className="group-split-pay-readonly">
              <h3 className="h6">یادداشت گروه</h3>
              <p className="muted-sm group-split-note">{payInfo.note}</p>
            </div>
          ) : null}

          {checklist.length > 0 ? (
            <TeamChecklist
              mode="readonly"
              checklist={checklist}
              progress={progress}
              bookerName={bookerName}
              newName=""
              onNewNameChange={() => {}}
              onToggle={() => {}}
              onUpdateName={() => {}}
              onRemove={() => {}}
              onAdd={() => {}}
              onSeed={() => {}}
              playerCount={players}
            />
          ) : null}

          <p className="muted-sm" style={{ marginTop: '0.75rem' }}>
            پرداخت سانس از طریق سانس‌چی انجام شده؛ تیک‌ها فقط وضعیت تقسیم بین خودتان است.
          </p>
        </>
      )}

      {shareHint ? <p className="group-split-hint muted-sm">{shareHint}</p> : null}
    </section>
  );
  },
);

function TeamChecklist({
  mode,
  checklist,
  progress,
  bookerName,
  newName,
  onNewNameChange,
  onToggle,
  onUpdateName,
  onRemove,
  onAdd,
  onSeed,
  playerCount,
  reservationAwaitingPayment,
}: {
  mode: 'edit' | 'readonly';
  checklist: GroupChecklistItem[];
  progress: { done: number; total: number; remaining: number };
  bookerName?: string;
  newName: string;
  onNewNameChange: (v: string) => void;
  onToggle: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onSeed: () => void;
  playerCount: number;
  reservationAwaitingPayment?: boolean;
}) {
  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const settleLabel = bookerName
    ? `زد (به ${bookerName})`
    : 'زد (سهم داد)';

  return (
    <div className="group-split-checklist">
      <div className="group-split-checklist__head">
        <h3 className="h6">چک‌لیست تیم</h3>
        {progress.total > 0 ? (
          <span className="group-split-checklist__badge">
            {numFa(progress.done)} از {numFa(progress.total)}
          </span>
        ) : null}
      </div>
      <p className="muted-sm group-split-checklist__hint">
        {mode === 'edit' && reservationAwaitingPayment
          ? '«زده ✓» = آن بازیکن سهم را به شما (رزروکننده) داده — جایگزین پرداخت سانس در سانس‌چی نیست.'
          : mode === 'edit'
            ? 'بعد از هر تغییر، لینک را دوباره برای گروه بفرستید.'
            : 'وضعیت آخرین لینکی که رزروکننده فرستاده.'}
      </p>
      {progress.total > 0 ? (
        <div
          className="group-split-checklist__bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="پیشرفت تسویه با رزروکننده"
        >
          <span className="group-split-checklist__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {mode === 'edit' && checklist.length === 0 ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onSeed}>
          ساخت لیست برای {numFa(playerCount)} نفر
        </button>
      ) : null}

      <ul className="group-split-checklist__list">
        {checklist.map((item) => (
          <li key={item.id} className={item.settled ? 'is-done' : ''}>
            <label className="group-split-checklist__row">
              <input
                type="checkbox"
                checked={item.settled}
                disabled={mode === 'readonly'}
                onChange={() => onToggle(item.id)}
              />
              {mode === 'edit' ? (
                <input
                  type="text"
                  className="group-split-checklist__name-input"
                  value={item.name}
                  onChange={(e) => onUpdateName(item.id, e.target.value)}
                  aria-label="نام"
                />
              ) : (
                <span className="group-split-checklist__name">{item.name}</span>
              )}
              <span className="group-split-checklist__status muted-sm">
                {item.settled ? 'زده ✓' : settleLabel}
              </span>
            </label>
            {mode === 'edit' ? (
              <button
                type="button"
                className="group-split-checklist__remove"
                aria-label="حذف"
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {mode === 'edit' ? (
        <div className="group-split-checklist__add">
          <input
            type="text"
            placeholder="نام بازیکن"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd();
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
            افزودن
          </button>
        </div>
      ) : null}
    </div>
  );
}
