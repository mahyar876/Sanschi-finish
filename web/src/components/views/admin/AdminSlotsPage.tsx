'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import type { Pitch } from '@/lib/pitch-types';
import { fetchAllPitches, updatePitch } from '@/lib/pitch-service';
import { priceFa } from '@/lib/format';
import { SlotTimeRangeTableCells } from '@/components/form/SlotTimeRangePicker';

export function AdminSlotsPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [idx, setIdx] = useState(0);
  const [bulkPeriod, setBulkPeriod] = useState<'morning' | 'evening' | 'all'>('morning');
  const [bulkPrice, setBulkPrice] = useState(550_000);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => void fetchAllPitches().then(setPitches), []);
  useEffect(() => {
    load();
  }, [load]);

  const pitch = pitches[idx];

  function applyBulk() {
    if (!pitch) return;
    const slots = pitch.slots.map((s, i) => {
      let price = s.price;
      if (bulkPeriod === 'all') price = bulkPrice;
      else if (bulkPeriod === 'morning' && i <= 6) price = bulkPrice;
      else if (bulkPeriod === 'evening' && i >= 7) price = bulkPrice;
      return { ...s, price };
    });
    setPitches((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, slots } : p)),
    );
    setMsg('قیمت‌ها در فرم به‌روز شد — «ذخیره سانس‌ها» را بزنید');
  }

  async function saveSlots() {
    if (!pitch) return;
    await updatePitch(pitch._id, { slots: pitch.slots });
    setMsg('✓ سانس‌ها ذخیره شد');
    load();
  }

  return (
    <>
      <PageIntro
        title="سانس‌ها و قیمت‌ها"
        description="برای هر مجموعه، بازه زمانی و قیمت پایه هر سانس را تنظیم کنید."
      />
      {msg && <p className="notice">{msg}</p>}
      <ActionsPanel title="انتخاب مجموعه">
        <div className="field" style={{ maxWidth: 360 }}>
          <label>زمین</label>
          <select
            value={idx}
            onChange={(e) => setIdx(parseInt(e.target.value, 10))}
            disabled={!pitches.length}
          >
            {pitches.map((p, i) => (
              <option key={p._id} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </ActionsPanel>
      {pitch && (
        <>
          <ActionsPanel title="تغییر دسته‌جمعی">
            <div className="bulk-row">
              <div className="field bulk-field">
                <label>بازه</label>
                <select value={bulkPeriod} onChange={(e) => setBulkPeriod(e.target.value as typeof bulkPeriod)}>
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
          <DataSection title={`جدول سانس — ${pitch.name}`}>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={3}>#</th>
                    <th colSpan={5} className="slot-time-table-head">
                      بازهٔ زمانی
                    </th>
                    <th rowSpan={3}>قیمت (تومان)</th>
                  </tr>
                  <tr className="slot-time-table-subhead">
                    <th colSpan={2} className="slot-time-th-group">
                      شروع
                    </th>
                    <th aria-hidden />
                    <th colSpan={2} className="slot-time-th-group">
                      پایان
                    </th>
                  </tr>
                  <tr className="slot-time-table-subhead slot-time-table-subhead--hm">
                    <th>دقیقه</th>
                    <th>ساعت</th>
                    <th aria-hidden />
                    <th>دقیقه</th>
                    <th>ساعت</th>
                  </tr>
                </thead>
                <tbody>
                  {pitch.slots.map((s, i) => (
                    <tr key={i} className="slot-time-table-row">
                      <td>{i + 1}</td>
                      <SlotTimeRangeTableCells
                        idPrefix={`slot-${pitch._id}-${i}`}
                        value={s.time}
                        onChange={(time) => {
                          const slots = [...pitch.slots];
                          slots[i] = { ...s, time };
                          setPitches((prev) =>
                            prev.map((p, pi) => (pi === idx ? { ...p, slots } : p)),
                          );
                        }}
                      />
                      <td>
                        <input
                          className="tbl-inp"
                          type="number"
                          value={s.price}
                          onChange={(e) => {
                            const slots = [...pitch.slots];
                            slots[i] = { ...s, price: parseInt(e.target.value, 10) || 0 };
                            setPitches((prev) =>
                              prev.map((p, pi) => (pi === idx ? { ...p, slots } : p)),
                            );
                          }}
                        />
                        <span className="muted-sm"> {priceFa(s.price)}</span>
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
