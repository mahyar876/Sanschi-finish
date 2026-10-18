'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import type { Pitch } from '@/lib/pitch-types';
import { fetchPitchForOwner, updatePitch } from '@/lib/pitch-service';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';
import { toJalaliApiDate } from '@/lib/jalali';
import { isDemoFrontend } from '@/lib/demo';
import { ApiError } from '@/lib/fetch-api';
import { displaySlotTime } from '@/lib/slot-time';
import {
  fetchOwnerDaily,
  patchOwnerLastMinute,
  patchOwnerSlotBlock,
  postOwnerManualReservation,
  type OwnerDailySlot,
} from '@/lib/owner-api';

const STATE_FA: Record<OwnerDailySlot['state'], string> = {
  free: 'آزاد',
  reserved: 'رزرو‌شده',
  pending: 'در انتظار پرداخت',
  blocked: 'مسدود',
  past: 'گذشته',
};

export function OwnerSlotsView() {
  const search = useSearchParams();
  const { pitches, pitchId, setPitchId } = useOwnerPitches();
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [bulkPeriod, setBulkPeriod] = useState<'morning' | 'evening' | 'all'>('morning');
  const [bulkPrice, setBulkPrice] = useState(550_000);
  const [viewDate, setViewDate] = useState(() => toJalaliApiDate(new Date()));
  const [dailySlots, setDailySlots] = useState<OwnerDailySlot[]>([]);
  const [lastMinuteOn, setLastMinuteOn] = useState(true);
  const [msg, setMsg] = useState('');
  const [manualSlot, setManualSlot] = useState<OwnerDailySlot | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  useEffect(() => {
    const q = search.get('pitch');
    if (q) setPitchId(q);
  }, [search, setPitchId]);

  const loadPitch = useCallback(() => {
    if (!pitchId) return;
    void fetchPitchForOwner(pitchId).then((p) => {
      if (!p) {
        setPitch(null);
        setMsg('زمین پیدا نشد — از لیست زمین‌ها دوباره انتخاب کنید.');
        return;
      }
      setMsg('');
      setPitch(p);
      setBulkPrice(p.price || 550_000);
      setLastMinuteOn(p.lastMinuteEnabled !== false);
    });
  }, [pitchId]);

  const loadDaily = useCallback(() => {
    if (!pitchId || isDemoFrontend()) return;
    void fetchOwnerDaily(pitchId, viewDate)
      .then((d) => {
        if (d.success) setDailySlots(d.slots);
      })
      .catch(() => {
        setMsg('بارگذاری سانس روز ناموفق بود');
      });
  }, [pitchId, viewDate]);

  useEffect(() => {
    loadPitch();
  }, [loadPitch]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  const slots = pitch?.slots ?? [];

  const grid = useMemo(() => {
    if (dailySlots.length > 0) return dailySlots;
    return slots.map((s, i) => ({
      slotIndex: i,
      time: s.time,
      price: s.price,
      state: (s.taken ? 'reserved' : 'free') as OwnerDailySlot['state'],
      blocked: false,
      reservationCode: null,
      customerName: null,
      customerPhone: null,
      flashEligible: false,
      hoursUntil: null,
    }));
  }, [dailySlots, slots]);

  const flashCount = grid.filter((s) => s.flashEligible).length;

  function applyBulk() {
    if (!pitch) return;
    const next = pitch.slots.map((s, i) => {
      let price = s.price;
      if (bulkPeriod === 'all') price = bulkPrice;
      else if (bulkPeriod === 'morning' && i <= 6) price = bulkPrice;
      else if (bulkPeriod === 'evening' && i >= 7) price = bulkPrice;
      return { ...s, price };
    });
    setPitch({ ...pitch, slots: next });
    setMsg('قیمت‌ها در فرم به‌روز شد — «ذخیره سانس‌ها» را بزنید');
  }

  async function saveSlots() {
    if (!pitch) return;
    await updatePitch(pitch._id, { slots: pitch.slots });
    setMsg('✓ سانس‌ها ذخیره شد');
    loadPitch();
  }

  async function toggleBlock(s: OwnerDailySlot) {
    if (!pitchId || isDemoFrontend()) {
      setMsg('مسدودسازی در حالت نمایشی فعال نیست');
      return;
    }
    const blocked = s.state !== 'blocked';
    try {
      await patchOwnerSlotBlock(pitchId, {
        date: viewDate,
        slotIndex: s.slotIndex,
        blocked,
      });
      setMsg(blocked ? 'سانس مسدود شد' : 'سانس آزاد شد');
      loadDaily();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'خطا');
    }
  }

  async function submitManual() {
    if (!pitchId || !manualSlot) return;
    setManualBusy(true);
    setMsg('');
    try {
      const data = await postOwnerManualReservation(pitchId, {
        date: viewDate,
        slotIndex: manualSlot.slotIndex,
        customerName: manualName.trim(),
        customerPhone: manualPhone.trim(),
        note: manualNote.trim() || undefined,
      });
      setMsg(`✓ ${data.message} — کد: ${data.reservation.code}`);
      setManualSlot(null);
      setManualName('');
      setManualPhone('');
      setManualNote('');
      loadDaily();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'ثبت رزرو ناموفق');
    } finally {
      setManualBusy(false);
    }
  }

  async function toggleLastMinute() {
    if (!pitchId || isDemoFrontend()) return;
    const next = !lastMinuteOn;
    try {
      const d = await patchOwnerLastMinute(pitchId, next);
      setLastMinuteOn(d.lastMinuteEnabled);
      setMsg(next ? 'تخفیف لحظه‌آخر فعال شد' : 'تخفیف لحظه‌آخر غیرفعال شد');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'خطا');
    }
  }

  function onSlotClick(s: OwnerDailySlot) {
    if (s.state === 'past') return;
    if (s.state === 'free') {
      setManualSlot(s);
      return;
    }
    if (s.state === 'blocked' || s.blocked) {
      void toggleBlock(s);
      return;
    }
    if (s.reservationCode) {
      setMsg(`رزرو: ${s.reservationCode}${s.customerName ? ` — ${s.customerName}` : ''}`);
    }
  }

  return (
    <>
      <PageIntro
        title="مدیریت سانس‌ها"
        description="تقویم روزانه، رزرو تلفنی، مسدود کردن سانس و تخفیف لحظه‌آخر."
      />
      {msg && <p className="notice">{msg}</p>}
      {pitches.length > 1 && (
        <div className="field owner-tools-field owner-slots-pitch-pick">
          <label htmlFor="owner-slots-pitch">مجموعه</label>
          <select
            id="owner-slots-pitch"
            value={pitchId}
            onChange={(e) => setPitchId(e.target.value)}
          >
            {pitches.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {pitch && (
        <>
          <div className="owner-tools-panel panel" style={{ marginBottom: '1rem' }}>
            <div className="field owner-tools-field">
              <label htmlFor="owner-slots-date">تاریخ (جلالی)</label>
              <input
                id="owner-slots-date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                placeholder="1404/07/18"
                dir="ltr"
                className="owner-date-input"
              />
            </div>
            {flashCount > 0 && (
              <p className="owner-lm-hint">
                {flashCount} سانس خالی در ۲۴ ساعت آینده — با تخفیف لحظه‌آخر سریع‌تر پر می‌شوند.
              </p>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void toggleLastMinute()}
            >
              تخفیف لحظه‌آخر: {lastMinuteOn ? 'فعال' : 'غیرفعال'}
            </button>
          </div>

          <ActionsPanel title={`تقویم — ${viewDate}`}>
            <div className="slot-legend">
              {(['free', 'pending', 'reserved', 'blocked', 'past'] as const).map((k) => (
                <span key={k} className={`slot-chip state-${k}`}>
                  {STATE_FA[k]}
                </span>
              ))}
            </div>
            <div className="slot-day-grid">
              {grid.map((s) => (
                <button
                  key={s.slotIndex}
                  type="button"
                  className={`slot-day-card state-${s.state}${s.flashEligible ? ' slot-flash' : ''}`}
                  onClick={() => onSlotClick(s)}
                  disabled={s.state === 'past'}
                >
                  <span className="slot-day-time">{displaySlotTime(s.time)}</span>
                  <span className="slot-day-price">{priceFa(s.price)}</span>
                  <span className="slot-day-state">{STATE_FA[s.state]}</span>
                  {s.reservationCode && (
                    <span className="slot-day-code muted-sm">{s.reservationCode}</span>
                  )}
                  {s.flashEligible && <span className="slot-day-flash">Flash</span>}
                </button>
              ))}
            </div>
            <p className="muted-sm" style={{ marginTop: '0.65rem' }}>
              روی سانس <strong>آزاد</strong> بزنید → رزرو تلفنی. روی <strong>مسدود</strong> →
              آزاد کردن. برای مسدود کردن سانس آزاد از دکمه زیر کارت استفاده کنید.
            </p>
          </ActionsPanel>

          {manualSlot && (
            <section className="panel owner-manual-panel" aria-labelledby="owner-manual-title">
              <h2 id="owner-manual-title" className="panel-title">
                رزرو تلفنی / حضوری — {manualSlot.time}
              </h2>
              <div className="owner-manual-grid">
                <div className="field">
                  <label htmlFor="manual-name">نام مشتری</label>
                  <input
                    id="manual-name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="مثلاً علی رضایی"
                  />
                </div>
                <div className="field">
                  <label htmlFor="manual-phone">موبایل</label>
                  <input
                    id="manual-phone"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="09121234567"
                    dir="ltr"
                  />
                </div>
                <div className="field owner-manual-note">
                  <label htmlFor="manual-note">یادداشت (اختیاری)</label>
                  <input
                    id="manual-note"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="پرداخت نقدی، تیم ثابت…"
                  />
                </div>
              </div>
              <div className="owner-inline-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={manualBusy}
                  onClick={() => void submitManual()}
                >
                  {manualBusy ? '…' : 'ثبت و رزرو سانس'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void toggleBlock(manualSlot)}
                >
                  فقط مسدود کردن
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setManualSlot(null)}
                >
                  انصراف
                </button>
              </div>
            </section>
          )}

          <ActionsPanel title="تغییر دسته‌جمعی قیمت (الگوی زمین)">
            <div className="bulk-row">
              <div className="field bulk-field">
                <label>بازه</label>
                <select
                  value={bulkPeriod}
                  onChange={(e) => setBulkPeriod(e.target.value as typeof bulkPeriod)}
                >
                  <option value="morning">صبح و ظهر (۱–۷)</option>
                  <option value="evening">عصر و شب (۸–۱۱)</option>
                  <option value="all">همه</option>
                </select>
              </div>
              <div className="field bulk-field">
                <label>قیمت (تومان)</label>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={applyBulk}>
                اعمال روی فرم
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveSlots()}>
                ذخیره سانس‌ها
              </button>
            </div>
          </ActionsPanel>
          <DataSection title="جدول سانس">
            <div className="data-table-wrap owner-card-table-wrap">
              <table className="data-table owner-card-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>بازه</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                    <th>مشتری</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.map((s) => (
                    <tr key={s.slotIndex}>
                      <td data-label="#">{s.slotIndex + 1}</td>
                      <td data-label="بازه">{displaySlotTime(s.time)}</td>
                      <td data-label="قیمت">{priceFa(s.price)}</td>
                      <td data-label="وضعیت">
                        <span className={`slot-chip state-${s.state}`}>{STATE_FA[s.state]}</span>
                      </td>
                      <td data-label="مشتری" className="muted-sm">
                        {s.customerName || s.customerPhone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataSection>
        </>
      )}
    </>
  );
}
