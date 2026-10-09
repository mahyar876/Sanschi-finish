'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import type { Pitch, PitchSlot } from '@/lib/pitch-types';
import { fetchPitch, updatePitch } from '@/lib/pitch-service';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';

type SlotState = 'free' | 'reserved' | 'pending' | 'blocked';

function slotState(s: PitchSlot): SlotState {
  if (s.taken) return 'reserved';
  return 'free';
}

const STATE_FA: Record<SlotState, string> = {
  free: 'آزاد',
  reserved: 'رزرو‌شده',
  pending: 'در انتظار پرداخت',
  blocked: 'مسدود',
};

export function OwnerSlotsView() {
  const search = useSearchParams();
  const { pitches, pitchId, setPitchId } = useOwnerPitches();
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [bulkPeriod, setBulkPeriod] = useState<'morning' | 'evening' | 'all'>('morning');
  const [bulkPrice, setBulkPrice] = useState(550_000);
  const [viewDay] = useState('امروز');
  const [msg, setMsg] = useState('');
  const [localStates, setLocalStates] = useState<Record<number, SlotState>>({});

  useEffect(() => {
    const q = search.get('pitch');
    if (q) setPitchId(q);
  }, [search, setPitchId]);

  const load = useCallback(() => {
    if (!pitchId) return;
    void fetchPitch(pitchId).then((p) => {
      setPitch(p);
      setBulkPrice(p.price || 550_000);
    });
  }, [pitchId]);

  useEffect(() => {
    load();
  }, [load]);

  const slots = pitch?.slots ?? [];

  const grid = useMemo(() => {
    return slots.map((s, i) => {
      const st = localStates[i] ?? slotState(s);
      return { ...s, index: i, state: st };
    });
  }, [slots, localStates]);

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
    load();
  }

  function cycleState(i: number) {
    const order: SlotState[] = ['free', 'pending', 'reserved', 'blocked'];
    const cur = localStates[i] ?? slotState(slots[i]);
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setLocalStates((prev) => ({ ...prev, [i]: next }));
    if (pitch && next === 'free') {
      const updated = [...pitch.slots];
      updated[i] = { ...updated[i], taken: false };
      setPitch({ ...pitch, slots: updated });
    }
    if (pitch && next === 'reserved') {
      const updated = [...pitch.slots];
      updated[i] = { ...updated[i], taken: true };
      setPitch({ ...pitch, slots: updated });
    }
  }

  return (
    <>
      <PageIntro
        title="مدیریت سانس‌ها"
        description="نمای روزانه، قیمت‌گذاری و مدیریت سریع وضعیت هر سانس."
      />
      {msg && <p className="notice">{msg}</p>}
      {pitches.length > 0 && (
        <ActionsPanel title="انتخاب مجموعه">
          <div className="field" style={{ maxWidth: 360 }}>
            <label>زمین</label>
            <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
              {pitches.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </ActionsPanel>
      )}
      {pitch && (
        <>
          <ActionsPanel title={`تقویم روزانه — ${viewDay}`}>
            <div className="slot-legend">
              {(['free', 'pending', 'reserved', 'blocked'] as SlotState[]).map((k) => (
                <span key={k} className={`slot-chip state-${k}`}>
                  {STATE_FA[k]}
                </span>
              ))}
            </div>
            <div className="slot-day-grid">
              {grid.map((s) => (
                <button
                  key={s.index}
                  type="button"
                  className={`slot-day-card state-${s.state}`}
                  onClick={() => cycleState(s.index)}
                >
                  <span className="slot-day-time">{s.time}</span>
                  <span className="slot-day-price">{priceFa(s.price)}</span>
                  <span className="slot-day-state">{STATE_FA[s.state]}</span>
                </button>
              ))}
            </div>
            <p className="muted-sm" style={{ marginTop: '0.65rem' }}>
              برای تغییر سریع وضعیت روی هر کارت بزنید.
            </p>
          </ActionsPanel>
          <ActionsPanel title="تغییر دسته‌جمعی قیمت">
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
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>بازه</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.map((s) => (
                    <tr key={s.index}>
                      <td>{s.index + 1}</td>
                      <td>{s.time}</td>
                      <td>{priceFa(s.price)}</td>
                      <td>
                        <span className={`slot-chip state-${s.state}`}>{STATE_FA[s.state]}</span>
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
