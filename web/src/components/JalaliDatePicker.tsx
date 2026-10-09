'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  dateFromJalali,
  daysInJalaliMonth,
  jalaliToGregorian,
  JALALI_MONTHS,
  numFa,
  toJalaliParts,
  toJalaliString,
} from '@/lib/jalali';

const JP_WEEKDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export function JalaliDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = toJalaliParts(value);
  const [viewYear, setViewYear] = useState(selected.y);
  const [viewMonth, setViewMonth] = useState(selected.m);

  useEffect(() => {
    if (!open) return;
    const p = toJalaliParts(value);
    setViewYear(p.y);
    setViewMonth(p.m);
  }, [open, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayParts = toJalaliParts(today);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function selectDay(d: number) {
    onChange(dateFromJalali(viewYear, viewMonth, d));
    setOpen(false);
  }

  const firstGreg = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDate = new Date(firstGreg[0], firstGreg[1] - 1, firstGreg[2]);
  const startOffset = firstDate.getDay();
  const totalDays = daysInJalaliMonth(viewYear, viewMonth);

  const cells: ReactNode[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(<span key={`e-${i}`} className="jp-day jp-day-empty" />);
  }
  for (let d = 1; d <= totalDays; d++) {
    const gArr = jalaliToGregorian(viewYear, viewMonth, d);
    const gDate = new Date(gArr[0], gArr[1] - 1, gArr[2]);
    gDate.setHours(0, 0, 0, 0);
    const isPast = gDate < today;
    const isToday =
      todayParts.y === viewYear && todayParts.m === viewMonth && todayParts.d === d;
    const isSelected =
      selected.y === viewYear && selected.m === viewMonth && selected.d === d;
    let cls = 'jp-day';
    if (isToday) cls += ' jp-today';
    if (isSelected) cls += ' jp-selected';
    if (isPast) cls += ' jp-disabled';
    cells.push(
      <button
        key={d}
        type="button"
        className={cls}
        disabled={isPast}
        onClick={() => selectDay(d)}
      >
        {numFa(d)}
      </button>,
    );
  }

  return (
    <div className="jalali-date-wrap" ref={wrapRef}>
      <button
        type="button"
        className="jalali-date-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{toJalaliString(value)}</span>
        <span className="jalali-date-chevron" aria-hidden>
          ▾
        </span>
      </button>
      <div className={`jalali-picker${open ? ' open' : ''}`} role="dialog" aria-label="انتخاب تاریخ">
        <div className="jp-head">
          <button type="button" className="jp-nav-btn" onClick={() => changeMonth(1)} aria-label="ماه بعد">
            ‹
          </button>
          <span className="jp-title">
            {JALALI_MONTHS[viewMonth - 1]} {numFa(viewYear)}
          </span>
          <button type="button" className="jp-nav-btn" onClick={() => changeMonth(-1)} aria-label="ماه قبل">
            ›
          </button>
        </div>
        <div className="jp-weekdays">
          {JP_WEEKDAY_SHORT.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="jp-days">{cells}</div>
      </div>
    </div>
  );
}
