'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { numFa } from '@/lib/jalali';
import {
  addMinutesToHm,
  displaySlotTime,
  formatSlotRangeStorage,
  inputValueToSlotHm,
  parseSlotRange,
  slotHmToInputValue,
  type SlotHm,
} from '@/lib/slot-time';

const MINUTE_STEP = 5;

function hourOptions(): number[] {
  return Array.from({ length: 24 }, (_, h) => h);
}

function minuteOptions(extra?: number): number[] {
  const set = new Set<number>();
  for (let m = 0; m < 60; m += MINUTE_STEP) set.add(m);
  if (extra != null && extra >= 0 && extra < 60) set.add(extra);
  return [...set].sort((a, b) => a - b);
}

function hmLabel(n: number): string {
  return numFa(String(n).padStart(2, '0'));
}

function useSlotTimeRange(
  value: string,
  onChange: (value: string) => void,
  defaultDurationMin: number,
) {
  const parsed = parseSlotRange(value);
  const [start, setStart] = useState(
    slotHmToInputValue(parsed?.start ?? { h: 6, m: 0 }),
  );
  const [end, setEnd] = useState(
    slotHmToInputValue(parsed?.end ?? { h: 7, m: 30 }),
  );

  useEffect(() => {
    const p = parseSlotRange(value);
    if (!p) return;
    const nextStart = slotHmToInputValue(p.start);
    const nextEnd = slotHmToInputValue(p.end);
    setStart((cur) => (cur === nextStart ? cur : nextStart));
    setEnd((cur) => (cur === nextEnd ? cur : nextEnd));
  }, [value]);

  function emit(startVal: string, endVal: string) {
    const s = inputValueToSlotHm(startVal);
    let e = inputValueToSlotHm(endVal);
    if (!s) return;
    if (!e || e.h * 60 + e.m <= s.h * 60 + s.m) {
      e = addMinutesToHm(s, defaultDurationMin);
      setEnd(slotHmToInputValue(e));
    }
    onChange(formatSlotRangeStorage(s, e));
  }

  function onStartChange(v: string) {
    setStart(v);
    emit(v, end);
  }

  function onEndChange(v: string) {
    setEnd(v);
    emit(start, v);
  }

  function applyDuration(minutes: number) {
    const s = inputValueToSlotHm(start);
    if (!s) return;
    const e = addMinutesToHm(s, minutes);
    const endStr = slotHmToInputValue(e);
    setEnd(endStr);
    onChange(formatSlotRangeStorage(s, e));
  }

  const preview = displaySlotTime(value || formatSlotRangeStorage(
    inputValueToSlotHm(start) ?? { h: 6, m: 0 },
    inputValueToSlotHm(end) ?? { h: 7, m: 30 },
  ));

  return {
    start,
    end,
    onStartChange,
    onEndChange,
    applyDuration,
    preview,
  };
}

type HmSelectProps = {
  id: string;
  part: 'h' | 'm';
  value: string;
  ariaLabel: string;
  onChange: (next: string) => void;
  tableCell?: boolean;
};

function HmSelect({ id, part, value, ariaLabel, onChange, tableCell }: HmSelectProps) {
  const hm = inputValueToSlotHm(value) ?? { h: 0, m: 0 };
  const minutes = useMemo(() => minuteOptions(hm.m), [hm.m]);

  function patch(next: Partial<SlotHm>) {
    onChange(slotHmToInputValue({ ...hm, ...next }));
  }

  const select = (
    <select
      id={id}
      className={`slot-time-select slot-time-select--hm${tableCell ? ' slot-time-select--cell' : ''}`}
      value={part === 'h' ? hm.h : hm.m}
      aria-label={ariaLabel}
      onChange={(e) =>
        patch(part === 'h' ? { h: parseInt(e.target.value, 10) } : { m: parseInt(e.target.value, 10) })
      }
    >
      {(part === 'h' ? hourOptions() : minutes).map((n) => (
        <option key={n} value={n}>
          {hmLabel(n)}
        </option>
      ))}
    </select>
  );

  if (tableCell) {
    return <td className={`slot-time-td slot-time-td--${part}`}>{select}</td>;
  }
  return select;
}

type TimeClockProps = {
  idPrefix: string;
  groupLabel: string;
  shortLabel?: string;
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
};

function TimeClock({
  idPrefix,
  groupLabel,
  shortLabel,
  value,
  onChange,
  compact = false,
}: TimeClockProps) {
  return (
    <div
      className={`slot-time-clock${compact ? ' slot-time-clock--compact' : ''}`}
      role="group"
      aria-label={groupLabel}
    >
      {compact ? (
        <span className="slot-time-clock-tag" aria-hidden>
          {shortLabel ?? groupLabel}
        </span>
      ) : (
        <span className="slot-time-group-label">{groupLabel}</span>
      )}
      <div className="slot-time-clock-face" dir="ltr">
        <HmSelect
          id={`${idPrefix}-h`}
          part="h"
          value={value}
          ariaLabel={`${groupLabel} — ساعت`}
          onChange={onChange}
        />
        <span className="slot-time-clock-colon" aria-hidden>
          :
        </span>
        <HmSelect
          id={`${idPrefix}-m`}
          part="m"
          value={value}
          ariaLabel={`${groupLabel} — دقیقه`}
          onChange={onChange}
        />
      </div>
      {!compact && (
        <div className="slot-time-hm-headings muted-sm" aria-hidden>
          <span>ساعت</span>
          <span>دقیقه</span>
        </div>
      )}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultDurationMin?: number;
  compact?: boolean;
};

const DURATION_PRESETS = [
  { label: '۱ ساعت', min: 60 },
  { label: '۹۰ دقیقه', min: 90 },
  { label: '۲ ساعت', min: 120 },
];

export function SlotTimeRangePicker({
  value,
  onChange,
  defaultDurationMin = 90,
  compact = false,
}: Props) {
  const baseId = useId();
  const { start, end, onStartChange, onEndChange, applyDuration, preview } = useSlotTimeRange(
    value,
    onChange,
    defaultDurationMin,
  );

  return (
    <div className={`slot-time-range-picker${compact ? ' slot-time-range-picker--compact' : ''}`}>
      <div className="slot-time-range-fields">
        <TimeClock
          compact={compact}
          idPrefix={`${baseId}-start`}
          groupLabel="شروع"
          shortLabel="ش"
          value={start}
          onChange={onStartChange}
        />
        <span className="slot-time-sep" aria-hidden>
          تا
        </span>
        <TimeClock
          compact={compact}
          idPrefix={`${baseId}-end`}
          groupLabel="پایان"
          shortLabel="پ"
          value={end}
          onChange={onEndChange}
        />
      </div>
      {!compact && (
        <div className="slot-time-presets">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.min}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => applyDuration(p.min)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      {!compact && (
        <p className="slot-time-preview muted-sm" dir="ltr" title={value}>
          {preview}
        </p>
      )}
    </div>
  );
}

/** پنج سلول جدول هم‌تراز با هدر ساعت/دقیقه */
export function SlotTimeRangeTableCells({
  value,
  onChange,
  defaultDurationMin = 90,
  idPrefix: idPrefixProp,
}: Props & { idPrefix?: string }) {
  const autoId = useId();
  const idPrefix = idPrefixProp ?? autoId;
  const { start, end, onStartChange, onEndChange } = useSlotTimeRange(
    value,
    onChange,
    defaultDurationMin,
  );

  return (
    <>
      <HmSelect
        tableCell
        id={`${idPrefix}-sm`}
        part="m"
        value={start}
        ariaLabel="شروع — دقیقه"
        onChange={onStartChange}
      />
      <HmSelect
        tableCell
        id={`${idPrefix}-sh`}
        part="h"
        value={start}
        ariaLabel="شروع — ساعت"
        onChange={onStartChange}
      />
      <td className="slot-time-td slot-time-td--sep" aria-hidden>
        <span className="slot-time-sep-inline">تا</span>
      </td>
      <HmSelect
        tableCell
        id={`${idPrefix}-em`}
        part="m"
        value={end}
        ariaLabel="پایان — دقیقه"
        onChange={onEndChange}
      />
      <HmSelect
        tableCell
        id={`${idPrefix}-eh`}
        part="h"
        value={end}
        ariaLabel="پایان — ساعت"
        onChange={onEndChange}
      />
    </>
  );
}
