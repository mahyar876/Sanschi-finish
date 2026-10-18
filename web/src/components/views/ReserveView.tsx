'use client';

import Link from 'next/link';
import { VenueImage } from '@/components/VenueImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import { savePendingBooking } from '@/lib/booking-pending';
import {
  fetchCatalog,
  resolveCatalogPitchId,
  type CatalogVenue,
} from '@/lib/catalog';
import { CATEGORY_LABEL } from '@/data/venues';
import { isDemoFrontend, isLiveBookingForPitch } from '@/lib/demo';
import { getToken, getUser } from '@/lib/session';
import { JalaliDatePicker } from '@/components/JalaliDatePicker';
import { StepperInput } from '@/components/form/StepperInput';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import {
  jalaliToGregorian,
  numFa,
  todayLocalDay,
  toJalaliApiDate,
  toJalaliString,
} from '@/lib/jalali';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { buildDemoSlotsForPitch } from '@/lib/flash-deals';
import { DEFAULT_SLOT_TIMES } from '@/lib/pitch-types';
import {
  addLocalDays,
  dayHasRemainingBookableSlots,
  defaultReserveLocalDay,
  displaySlotTime,
  isSameLocalDay,
} from '@/lib/slot-time';
import { WomenBookingNotice } from '@/components/WomenBookingNotice';

type Slot = {
  slotIndex: number;
  time: string;
  sitePrice?: number;
  originalSitePrice?: number;
  discountPercent?: number;
  flashDeal?: boolean;
  urgency?: string;
  price?: number;
  taken: boolean;
  bookable?: boolean;
  displayStatus?: string;
  lockUntil?: string | null;
  /** قفل موقت توسط همین کاربر (بعد از رفرش) */
  heldByMe?: boolean;
};

const LIVE_SLOT_POLL_MS = 3_000;
const DEMO_SLOT_POLL_MS = 8_000;

const SLOT_FA: Record<string, string> = {
  free: 'آزاد',
  locked: 'در حال رزرو',
  mine: 'انتخاب شما',
  booked: 'رزرو شده',
  blocked: 'غیرفعال',
  past: 'گذشته',
};

function slotStatus(s: Slot): string {
  if (s.displayStatus) return s.displayStatus;
  if (
    !s.taken &&
    s.lockUntil &&
    new Date(s.lockUntil).getTime() > Date.now()
  ) {
    return 'locked';
  }
  if (s.bookable === false && !s.taken) return 'blocked';
  return s.taken ? 'booked' : 'free';
}

function isMySlotHold(s: Slot, heldSlotIndex: number | null): boolean {
  return heldSlotIndex === s.slotIndex || !!s.heldByMe;
}

function slotDisabled(s: Slot, heldSlotIndex: number | null): boolean {
  const st = slotStatus(s);
  if (st === 'locked' && isMySlotHold(s, heldSlotIndex)) return false;
  return (
    s.bookable === false ||
    st === 'past' ||
    st === 'booked' ||
    st === 'blocked' ||
    st === 'locked' ||
    (s.bookable === undefined && s.taken)
  );
}

type SlotDayPart = 'morning' | 'afternoon' | 'evening';

function slotDayPart(index: number): SlotDayPart {
  if (index < 4) return 'morning';
  if (index < 7) return 'afternoon';
  return 'evening';
}

type SlotView = 'bookable' | 'morning' | 'afternoon' | 'evening' | 'all';

export function ReserveView() {
  const router = useRouter();
  const search = useSearchParams();
  const venueSlug = search.get('venue');
  const pitchIdFromUrl = search.get('pitchId');

  const [catalog, setCatalog] = useState<CatalogVenue[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [pitchId, setPitchId] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotIndex, setSlotIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [pitchFilter, setPitchFilter] = useState<'all' | 'futsal' | 'grass' | 'volleyball' | 'multi'>(
    'all',
  );
  const [slotView, setSlotView] = useState<SlotView>('bookable');
  const [heldSlotIndex, setHeldSlotIndex] = useState<number | null>(null);
  const [slotPickLoading, setSlotPickLoading] = useState(false);
  const [catalogLive, setCatalogLive] = useState(false);
  const [apiReachable, setApiReachable] = useState(false);
  const [pitchesFromDb, setPitchesFromDb] = useState(false);
  const heldSlotRef = useRef<number | null>(null);
  const pickingRef = useRef(false);
  const autoPickSlotRef = useRef<number | null>(null);
  const userPickedDateRef = useRef(false);

  useEffect(() => {
    heldSlotRef.current = heldSlotIndex;
  }, [heldSlotIndex]);

  const buildReserveReturnUrl = useCallback(
    (extra?: Record<string, string>) => {
      const q = new URLSearchParams();
      if (venueSlug) q.set('venue', venueSlug);
      if (pitchId) q.set('pitchId', pitchId);
      if (date) q.set('date', toJalaliApiDate(date));
      if (extra) {
        for (const [k, v] of Object.entries(extra)) q.set(k, v);
      }
      const s = q.toString();
      return s ? `/reserve?${s}` : '/reserve';
    },
    [venueSlug, pitchId, date],
  );

  const dateFromUrl = search.get('date');
  const slotFromUrl = search.get('slot');

  useEffect(() => {
    userPickedDateRef.current = false;
    if (dateFromUrl) {
      const parts = dateFromUrl.split('/').map((x) => parseInt(x, 10));
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        const [gy, gm, gd] = jalaliToGregorian(parts[0], parts[1], parts[2]);
        setDate(new Date(gy, gm - 1, gd));
      } else {
        setDate(defaultReserveLocalDay(DEFAULT_SLOT_TIMES));
      }
    } else {
      setDate(defaultReserveLocalDay(DEFAULT_SLOT_TIMES));
    }
  }, [dateFromUrl]);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setName(u.name);
      setPhone(u.phone);
    }
    void fetchCatalog().then(({ items, live, apiReachable: apiUp, pitchesFromDb: fromDb }) => {
      setCatalog(items);
      setCatalogLive(live);
      setApiReachable(apiUp);
      setPitchesFromDb(fromDb);
      const resolved = resolveCatalogPitchId(items, {
        pitchId: pitchIdFromUrl,
        venueSlug,
      });
      if (resolved) setPitchId(resolved);
      setCatalogReady(true);
    });
  }, [venueSlug, pitchIdFromUrl]);

  useEffect(() => {
    if (!slotFromUrl) return;
    const idx = parseInt(slotFromUrl, 10);
    autoPickSlotRef.current = Number.isNaN(idx) ? null : idx;
  }, [slotFromUrl]);

  const applySlotsFromServer = useCallback((next: Slot[]) => {
    setSlots(next);
    const mine = next.find((s) => s.heldByMe);
    if (mine) {
      setHeldSlotIndex(mine.slotIndex);
      setSlotIndex((cur) => (cur == null ? mine.slotIndex : cur));
    }
  }, []);

  useEffect(() => {
    if (!pitchId || !date) return;
    setSlotIndex(null);
    setHeldSlotIndex(null);
    setSlotView('bookable');
    setSlotsLoading(true);

    let inFlight = false;
    let cancelled = false;
    const live = isLiveBookingForPitch(pitchId);
    const pollMs = live ? LIVE_SLOT_POLL_MS : DEMO_SLOT_POLL_MS;

    const load = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (inFlight) return;
      inFlight = true;

      if (!live) {
        void buildDemoSlotsForPitch(pitchId, date)
          .then((s) => {
            if (!cancelled) setSlots(s);
          })
          .finally(() => {
            inFlight = false;
            if (!cancelled) setSlotsLoading(false);
          });
        return;
      }
      const apiDate = toJalaliApiDate(date);
      void apiFetch<{ success: boolean; slots: Slot[] }>(
        `/pitches/${pitchId}/slots?date=${encodeURIComponent(apiDate)}`,
      )
        .then((data) => {
          if (!cancelled && data.success) applySlotsFromServer(data.slots);
        })
        .catch(() => {
          if (!cancelled && !isLiveBookingForPitch(pitchId)) {
            void buildDemoSlotsForPitch(pitchId, date).then(setSlots);
          }
        })
        .finally(() => {
          inFlight = false;
          if (!cancelled) setSlotsLoading(false);
        });
    };

    load();
    const tick = window.setInterval(load, pollMs);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pitchId, date, applySlotsFromServer]);

  useEffect(() => {
    if (userPickedDateRef.current || slotsLoading || !date || !slots.length) return;
    const today = todayLocalDay();
    if (!isSameLocalDay(date, today)) return;
    const times = slots.map((s) => s.time);
    if (dayHasRemainingBookableSlots(date, times)) return;
    setDate(addLocalDays(today, 1));
  }, [slots, slotsLoading, date]);

  const releaseHeldSlot = useCallback(async () => {
    const held = heldSlotRef.current;
    if (held == null || !pitchId || !date || !isLiveBookingForPitch(pitchId)) {
      return;
    }
    if (!getToken()) return;
    const apiDate = toJalaliApiDate(date);
    try {
      await apiFetch(`/pitches/${pitchId}/slots/release`, {
        method: 'POST',
        body: JSON.stringify({ date: apiDate, slotIndex: held }),
      });
    } catch {
      /* ignore */
    }
    setHeldSlotIndex(null);
  }, [pitchId, date]);

  useEffect(() => {
    return () => {
      void releaseHeldSlot();
    };
  }, [releaseHeldSlot]);

  const selectedVenue = useMemo(
    () => catalog.find((v) => v.pitchId === pitchId),
    [catalog, pitchId],
  );

  const filteredCatalog = useMemo(() => {
    let rows = catalog;
    if (pitchFilter !== 'all') {
      rows = rows.filter((v) => v.category === pitchFilter);
    }
    return rows;
  }, [catalog, pitchFilter]);

  const selectedSlot = slotIndex != null ? slots.find((s) => s.slotIndex === slotIndex) : null;
  const amount = selectedSlot?.sitePrice ?? selectedSlot?.price ?? 0;
  const regularWeekAmount = selectedSlot?.originalSitePrice ?? amount;
  const recurringLastMinuteSplit =
    recurring &&
    !!selectedSlot?.flashDeal &&
    weeks > 1 &&
    regularWeekAmount !== amount;
  const payableAmount = useMemo(() => {
    if (!selectedSlot) return 0;
    if (!recurring) return amount;
    if (weeks <= 1) return amount;
    const regular = selectedSlot.originalSitePrice ?? amount;
    return amount + regular * (weeks - 1);
  }, [selectedSlot, recurring, amount, weeks]);
  const freeCount = slots.filter((s) => !slotDisabled(s, heldSlotIndex)).length;

  const visibleSlots = useMemo(() => {
    return slots.filter((s) => {
      const st = slotStatus(s);
      if (st === 'past') return false;
      if (slotView === 'bookable') {
        return st === 'free' || st === 'locked';
      }
      if (slotView === 'all') return true;
      return slotDayPart(s.slotIndex) === slotView;
    });
  }, [slots, slotView]);

  const refreshSlots = useCallback(async () => {
    if (!pitchId || !date) return;
    try {
      if (!isLiveBookingForPitch(pitchId)) {
        setSlots(await buildDemoSlotsForPitch(pitchId, date));
        return;
      }
      const apiDate = toJalaliApiDate(date);
      const data = await apiFetch<{ success: boolean; slots: Slot[] }>(
        `/pitches/${pitchId}/slots?date=${encodeURIComponent(apiDate)}`,
      );
      if (data.success) applySlotsFromServer(data.slots);
    } catch {
      /* ignore background refresh errors */
    }
  }, [pitchId, date, applySlotsFromServer]);

  const clearHeldSelection = useCallback(async () => {
    const held = heldSlotRef.current;
    if (!pitchId || !date) return;
    setErr('');
    if (held != null && isLiveBookingForPitch(pitchId) && getToken()) {
      const apiDate = toJalaliApiDate(date);
      pickingRef.current = true;
      setSlotPickLoading(true);
      try {
        await apiFetch(`/pitches/${pitchId}/slots/release`, {
          method: 'POST',
          body: JSON.stringify({ date: apiDate, slotIndex: held }),
        });
      } catch {
        /* ignore */
      } finally {
        pickingRef.current = false;
        setSlotPickLoading(false);
      }
    }
    setSlotIndex(null);
    setHeldSlotIndex(null);
    void refreshSlots().catch(() => {});
  }, [pitchId, date, refreshSlots]);

  const pickSlot = useCallback(
    async (idx: number) => {
      if (pickingRef.current) return;

      if (slotIndex === idx && heldSlotIndex === idx) {
        await clearHeldSelection();
        return;
      }
      if (slotIndex === idx && heldSlotIndex == null && !isLiveBookingForPitch(pitchId)) {
        setSlotIndex(null);
        return;
      }

      const target = slots.find((s) => s.slotIndex === idx);
      if (!target || slotDisabled(target, heldSlotIndex)) return;

      setErr('');

      if (!pitchId || !date) return;

      const liveBooking = isLiveBookingForPitch(pitchId);
      if (!getToken() && liveBooking) {
        router.push(
          `/login?redirect=${encodeURIComponent(
            buildReserveReturnUrl({ slot: String(idx) }),
          )}`,
        );
        return;
      }

      if (!liveBooking) {
        setSlotIndex(idx);
        setErr(
          'رزرو همزمان فقط با اتصال به سرور ممکن است. Express را اجرا کنید (پورت ۵۰۰۰) و صفحه را رفرش کنید.',
        );
        return;
      }

      pickingRef.current = true;
      setSlotPickLoading(true);
      const prevHeld = heldSlotIndex;
      const prevSlotIndex = slotIndex;

      const apiDate = toJalaliApiDate(date);
      try {
        if (prevHeld != null && prevHeld !== idx) {
          await apiFetch(`/pitches/${pitchId}/slots/release`, {
            method: 'POST',
            body: JSON.stringify({ date: apiDate, slotIndex: prevHeld }),
          });
          setHeldSlotIndex(null);
        }

        setSlots((prev) =>
          prev.map((s) => {
            if (s.slotIndex === idx) {
              return { ...s, displayStatus: 'locked', bookable: false };
            }
            if (prevHeld != null && s.slotIndex === prevHeld) {
              return { ...s, displayStatus: 'free', bookable: true, taken: false };
            }
            return s;
          }),
        );

        const hold = await apiFetch<{ success: boolean; message?: string }>(
          `/pitches/${pitchId}/slots/hold`,
          {
            method: 'POST',
            body: JSON.stringify({ date: apiDate, slotIndex: idx }),
          },
        );
        if (!hold.success) {
          throw new Error(hold.message || 'سانس در دسترس نیست');
        }
        setSlotIndex(idx);
        setHeldSlotIndex(idx);
        void refreshSlots().catch(() => {});
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setSlotIndex(null);
          setHeldSlotIndex(null);
          autoPickSlotRef.current = null;
          router.push(
            `/login?redirect=${encodeURIComponent(
              buildReserveReturnUrl({ slot: String(idx) }),
            )}`,
          );
          return;
        }
        setSlotIndex(prevSlotIndex);
        setHeldSlotIndex(prevHeld);
        setErr(e instanceof Error ? e.message : 'این سانس الان قابل انتخاب نیست');
        void refreshSlots().catch(() => {});
      } finally {
        pickingRef.current = false;
        setSlotPickLoading(false);
      }
    },
    [
      slots,
      heldSlotIndex,
      slotIndex,
      pitchId,
      date,
      router,
      buildReserveReturnUrl,
      refreshSlots,
      clearHeldSelection,
    ],
  );

  useEffect(() => {
    const idx = autoPickSlotRef.current;
    if (idx == null || slotsLoading || !slots.length) return;
    const target = slots.find((s) => s.slotIndex === idx);
    if (!target || slotDisabled(target, heldSlotIndex)) {
      autoPickSlotRef.current = null;
      return;
    }
    autoPickSlotRef.current = null;
    void pickSlot(idx).catch(() => {});
  }, [slots, slotsLoading, heldSlotIndex, pickSlot]);

  const step = !pitchId ? 1 : slotIndex == null ? 2 : 3;

  async function submitRecurring() {
    setErr('');
    if (!getToken() && !isDemoFrontend()) {
      router.push('/login?redirect=/reserve');
      return;
    }
    if (!pitchId || slotIndex == null || !date) {
      setErr('سانس را انتخاب کنید');
      return;
    }
    if (name.trim().length < 2 || !/^09[0-9]{9}$/.test(phone)) {
      setErr('نام و شماره موبایل معتبر وارد کنید');
      return;
    }
    const dates: string[] = [];
    for (let w = 0; w < weeks; w++) {
      const d = new Date(date);
      d.setDate(d.getDate() + w * 7);
      dates.push(toJalaliApiDate(d));
    }
    setLoading(true);
    try {
      const pitchName = selectedVenue?.name || '';
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        groupId?: string;
        totalAmount?: number;
      }>('/reservations/recurring', {
        method: 'POST',
        body: JSON.stringify({ pitchId, slotIndex, dates }),
      });
      if (!data.success || !data.groupId) throw new Error(data.message);
      const q = new URLSearchParams({
        recurringGroupId: data.groupId,
        pitchName,
        date: dates[0],
        time: selectedSlot?.time || '',
        name: name.trim(),
        phone,
        amount: String(data.totalAmount ?? payableAmount),
        weeks: String(weeks),
      });
      if (recurringLastMinuteSplit) {
        q.set('firstWeekAmount', String(amount));
        q.set('regularWeekAmount', String(regularWeekAmount));
      } else {
        q.set('weeklyAmount', String(regularWeekAmount));
      }
      router.push(`/payment?${q.toString()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در رزرو تکراری');
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (recurring) {
      void submitRecurring();
      return;
    }
    setErr('');
    if (!pitchId || slotIndex == null) {
      setErr('یک سانس آزاد انتخاب کنید');
      return;
    }
    if (name.trim().length < 2 || !/^09[0-9]{9}$/.test(phone)) {
      setErr('نام و شماره موبایل معتبر وارد کنید');
      return;
    }
    const sel = slots.find((s) => s.slotIndex === slotIndex);
    if (sel && slotDisabled(sel, heldSlotIndex)) {
      setErr('این سانس قابل رزرو نیست.');
      return;
    }
    const needsHold =
      getToken() &&
      pitchId &&
      isLiveBookingForPitch(pitchId) &&
      heldSlotIndex !== slotIndex;
    if (needsHold) {
      setErr('در حال قفل کردن سانس…');
      void pickSlot(slotIndex);
      return;
    }
    if (!getToken() && !isDemoFrontend()) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          buildReserveReturnUrl({ slot: String(slotIndex) }),
        )}`,
      );
      return;
    }
    if (!date) return;
    const apiDate = toJalaliApiDate(date);
    const pitchName = selectedVenue?.name || '';
    const pending = {
      pitchId,
      pitchName,
      slotIndex,
      slotTime: selectedSlot?.time || '',
      date: apiDate,
      name: name.trim(),
      phone,
    };
    savePendingBooking(pending);
    const q = new URLSearchParams({
      pitchId,
      pitchName,
      slotIndex: String(slotIndex),
      slotTime: pending.slotTime,
      date: apiDate,
      name: pending.name,
      phone,
      amount: String(amount),
    });
    router.push(`/reserve/confirm?${q.toString()}`);
  }

  if (!date || !catalogReady) {
    return (
      <div className="page page-reserve">
        <p className="subtitle">در حال بارگذاری…</p>
      </div>
    );
  }

  return (
    <div className="page page-reserve">
      <header className="reserve-hero">
        <p className="eyebrow">رزرو آنلاین</p>
        <h1>انتخاب زمین، تاریخ و سانس</h1>
        <p className="reserve-hero-meta">
          {toJalaliString(date)} · {numFa(freeCount)} سانس آزاد در این روز
        </p>
      </header>

      {!isLiveBookingForPitch(pitchId) && (
        <p className="notice" role="alert">
          {!apiReachable
            ? 'سرور رزرو در دسترس نیست. در یک ترمینال: npm run dev:backend — در ترمینال دیگر: npm run dev:web'
            : !pitchesFromDb
              ? 'سرور وصل است ولی دیتابیس زمین خالی است. یک‌بار در پوشه backend اجرا کنید: node seed.js — بعد صفحه را رفرش کنید.'
              : 'برای قفل سانس، همین زمین را از لیست پایین دوباره انتخاب کنید (نه لینک demo).'}
        </p>
      )}

      <ol className="reserve-progress" aria-label="مراحل رزرو">
        <li className={step >= 1 ? 'active' : ''}>
          <span className="reserve-progress-num">۱</span>
          <span>زمین</span>
        </li>
        <li className={step >= 2 ? 'active' : ''}>
          <span className="reserve-progress-num">۲</span>
          <span>سانس</span>
        </li>
        <li className={step >= 3 ? 'active' : ''}>
          <span className="reserve-progress-num">۳</span>
          <span>تأیید</span>
        </li>
      </ol>

      <div className="reserve-layout">
        <div className="reserve-main">
          <section className="reserve-block panel">
            <div className="reserve-block-head">
              <div className="reserve-block-head-top">
                <h2>زمین</h2>
              </div>
              <div className="reserve-type-chips">
                {(
                  [
                    ['all', 'همه'],
                    ['futsal', 'فوتسال'],
                    ['grass', 'چمن'],
                    ['volleyball', 'والیبال'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={pitchFilter === id ? 'chip active' : 'chip'}
                    onClick={() => setPitchFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="reserve-pitch-picker-label muted-sm">انتخاب زمین</p>
            <div
              className="reserve-pitch-picker scroll-y-right"
              role="listbox"
              aria-label="انتخاب زمین"
            >
              {filteredCatalog.map((v) => (
                <button
                  key={v.pitchId}
                  type="button"
                  role="option"
                  aria-selected={pitchId === v.pitchId}
                  className={
                    pitchId === v.pitchId
                      ? 'reserve-pitch-card selected'
                      : 'reserve-pitch-card'
                  }
                  onClick={() => setPitchId(v.pitchId)}
                >
                  <span className="reserve-pitch-card-media">
                    <VenueImage src={v.image} category={v.category} alt="" fill sizes="120px" />
                  </span>
                  <span className="reserve-pitch-card-body">
                    <strong>{v.name}</strong>
                    <span className="muted-sm">
                      {CATEGORY_LABEL[v.category]} · {pitchSizeLabel(v.size)}
                    </span>
                    <span className="reserve-pitch-card-price">
                      از {priceFa(v.priceFrom)} تومان
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {selectedVenue && (
              <>
                <WomenBookingNotice allowed={selectedVenue.womenBookingAllowed} />
                <p className="reserve-venue-link muted-sm">
                  {selectedVenue.address}، {selectedVenue.city}
                </p>
              </>
            )}
          </section>

          <section className="reserve-block panel">
            <h2>تاریخ</h2>
            <JalaliDatePicker
              value={date}
              onChange={(d) => {
                userPickedDateRef.current = true;
                setDate(d);
              }}
            />
          </section>

          <section className="reserve-block reserve-block--slots panel">
            <h2 className="reserve-slots-title">
              سانس‌های {selectedVenue?.name || 'مجموعه'}
            </h2>
            <div className="slot-toolbar">
              <div
                className="slot-view-chips slot-view-chips--tight"
                role="tablist"
                aria-label="فیلتر سانس"
              >
                {(
                  [
                    ['bookable', 'فقط آزاد'],
                    ['morning', 'صبح'],
                    ['afternoon', 'بعدازظهر'],
                    ['evening', 'شب'],
                    ['all', 'همه'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={slotView === id}
                    className={slotView === id ? 'chip active' : 'chip'}
                    onClick={() => setSlotView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="slot-legend slot-legend--dots" aria-hidden="false">
                <span>
                  <i className="slot-dot state-free" /> آزاد
                </span>
                <span>
                  <i className="slot-dot state-pending" /> رزرو موقت
                </span>
                <span>
                  <i className="slot-dot state-reserved" /> پر
                </span>
                <span>
                  <i className="slot-dot state-blocked" /> بسته
                </span>
              </div>
            </div>
            {slotsLoading ? (
              <p className="subtitle">در حال دریافت سانس‌ها…</p>
            ) : slots.length === 0 ? (
              <p className="subtitle">برای این تاریخ سانسی تعریف نشده است.</p>
            ) : visibleSlots.length === 0 ? (
              <p className="subtitle">
                سانس آزاد در این فیلتر نیست. «همه» را بزنید یا تاریخ دیگری انتخاب کنید.
              </p>
            ) : (
              <div className="slot-day-grid slot-day-grid-compact">
                {visibleSlots.map((s) => {
                  const selected = slotIndex === s.slotIndex;
                  const isMyHold = isMySlotHold(s, heldSlotIndex);
                  const st = isMyHold ? 'mine' : slotStatus(s);
                  const disabled = slotDisabled(s, heldSlotIndex);
                  const stateClass =
                    st === 'mine'
                      ? 'state-free'
                      : st === 'free'
                        ? 'state-free'
                        : st === 'locked'
                          ? 'state-pending'
                          : st === 'past' || st === 'booked'
                            ? 'state-reserved'
                            : 'state-blocked';
                  const hasFlash =
                    !!s.flashDeal && s.originalSitePrice != null;
                  return (
                    <button
                      key={s.slotIndex}
                      type="button"
                      disabled={disabled || slotPickLoading}
                      aria-pressed={selected}
                      title={
                        isMyHold && selected
                          ? 'برای لغو انتخاب دوباره بزنید'
                          : undefined
                      }
                      className={`slot-tile slot-day-card ${stateClass}${selected ? ' selected' : ''}${isMyHold ? ' state-my-hold' : ''}${hasFlash ? ' has-flash' : ''}`}
                      onClick={() => void pickSlot(s.slotIndex)}
                    >
                      <span className="slot-tile__head">
                        <span className="slot-tile__time">{s.time}</span>
                        {hasFlash ? (
                          <span className="slot-tile__deal">
                            {numFa(s.discountPercent ?? 0)}٪
                          </span>
                        ) : null}
                      </span>
                      <span className="slot-tile__price">
                        {hasFlash ? (
                          <span className="slot-tile__was">
                            {priceFa(s.originalSitePrice!)}
                          </span>
                        ) : null}
                        <span className="slot-tile__now">
                          {priceFa(s.sitePrice ?? s.price ?? 0)}
                        </span>
                      </span>
                      <span className={`slot-tile__status ${stateClass}`}>
                        {SLOT_FA[st] || st}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedSlot && (
              <div className="reserve-mobile-checkout panel" aria-live="polite">
                <div className="reserve-mobile-checkout-row">
                  <span className="muted-sm">سانس انتخاب‌شده</span>
                  <strong>{displaySlotTime(selectedSlot.time)}</strong>
                </div>
                <div className="reserve-mobile-checkout-row reserve-mobile-checkout-total">
                  <span className="muted-sm">مبلغ</span>
                  <strong>{priceFa(payableAmount)} تومان</strong>
                </div>
                {!getToken() && isLiveBookingForPitch(pitchId) && (
                  <p className="muted-sm reserve-mobile-checkout-hint">
                    برای قفل موقت سانس و ادامهٔ پرداخت، با «ادامه» وارد حساب می‌شوید.
                  </p>
                )}
                {heldSlotIndex === selectedSlot.slotIndex && getToken() && (
                  <p className="muted-sm reserve-mobile-checkout-hint">
                    این سانس تا ۱۰ دقیقه برای شما نگه داشته شده است.{' '}
                    <button
                      type="button"
                      className="reserve-cancel-hold"
                      onClick={() => void clearHeldSelection()}
                    >
                      لغو انتخاب
                    </button>
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={submit}
                >
                  {recurring ? 'رزرو تکراری و پرداخت' : 'ادامه — ثبت رزرو'}
                </button>
              </div>
            )}
          </section>

          <section className="reserve-block panel reserve-contact">
            <h2>اطلاعات رزروکننده</h2>
            <p className="muted-sm reserve-contact-hint">
              برای پیگیری و تأیید سانس — در صورت ورود، خودکار پر می‌شود.
            </p>
            <div className="reserve-contact-fields">
              <div className="field">
                <label htmlFor="reserve-name">نام</label>
                <input
                  id="reserve-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً علی رضایی"
                  autoComplete="name"
                />
              </div>
              <div className="field">
                <label htmlFor="reserve-phone">موبایل</label>
                <input
                  id="reserve-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="reserve-recurring">
              <ToggleSwitch
                checked={recurring}
                onChange={setRecurring}
                label="رزرو تکراری هفتگی"
                description="همان سانس برای چند هفته پشت سر هم"
              />
              {recurring ? (
                <StepperInput
                  label="تعداد هفته"
                  suffix="هفته"
                  min={2}
                  max={12}
                  value={weeks}
                  onChange={setWeeks}
                />
              ) : null}
            </div>
          </section>
        </div>

        <aside className="reserve-summary panel" aria-live="polite">
          {selectedVenue && (
            <div className="reserve-summary-media">
              <VenueImage
                src={selectedVenue.image}
                category={selectedVenue.category}
                alt={selectedVenue.name}
                fill
                sizes="320px"
              />
            </div>
          )}
          <h2 className="reserve-summary-title">خلاصه رزرو</h2>
          <dl className="reserve-summary-list">
            <div>
              <dt>مجموعه</dt>
              <dd>{selectedVenue?.name || '—'}</dd>
            </div>
            <div>
              <dt>تاریخ</dt>
              <dd>{toJalaliString(date)}</dd>
            </div>
            <div>
              <dt>سانس</dt>
              <dd>
                {selectedSlot?.time
                  ? displaySlotTime(selectedSlot.time)
                  : 'انتخاب نشده'}
              </dd>
            </div>
            {recurring && selectedSlot ? (
              <>
                <div>
                  <dt>نوع رزرو</dt>
                  <dd>هفتگی — {numFa(weeks)} هفته</dd>
                </div>
                {recurringLastMinuteSplit ? (
                  <>
                    <div>
                      <dt>هفته اول (لحظه‌آخر)</dt>
                      <dd>{priceFa(amount)} تومان</dd>
                    </div>
                    <div>
                      <dt>هر هفته بعد</dt>
                      <dd>{priceFa(regularWeekAmount)} تومان</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>هر هفته</dt>
                    <dd>{priceFa(regularWeekAmount)} تومان</dd>
                  </div>
                )}
                <div className="reserve-summary-total">
                  <dt>جمع کل (تخمینی)</dt>
                  <dd>{priceFa(payableAmount)} تومان</dd>
                </div>
                <p className="muted-sm reserve-summary-hint">
                  مبلغ نهایی پس از ثبت رزروها روی صفحهٔ پرداخت نمایش داده می‌شود (اگر هفته‌ای
                  پر باشد از جمع کم می‌شود).
                </p>
              </>
            ) : (
              <div className="reserve-summary-total">
                <dt>مبلغ</dt>
                <dd>{selectedSlot ? `${priceFa(amount)} تومان` : '—'}</dd>
              </div>
            )}
          </dl>
          {selectedVenue ? (
            <WomenBookingNotice allowed={selectedVenue.womenBookingAllowed} />
          ) : null}
          {err && <p className="form-msg err">{err}</p>}
          <button
            type="button"
            className="btn btn-primary reserve-summary-cta"
            disabled={loading || !selectedSlot}
            onClick={submit}
          >
            {loading
              ? 'لطفاً صبر کنید…'
              : recurring
                ? 'رزرو تکراری و پرداخت'
                : 'ادامه — بررسی نهایی'}
          </button>
          {!selectedSlot && (
            <p className="muted-sm reserve-summary-hint">ابتدا یک سانس آزاد انتخاب کنید.</p>
          )}
        </aside>
      </div>

      <div className="reserve-mobile-bar" role="region" aria-label="خلاصه رزرو">
        <div className="reserve-mobile-bar-info">
          <span className="reserve-mobile-bar-label">
            {selectedSlot
              ? displaySlotTime(selectedSlot.time)
              : 'سانس را انتخاب کنید'}
          </span>
          <strong className="reserve-mobile-bar-price">
            {selectedSlot ? `${priceFa(payableAmount)} تومان` : '—'}
          </strong>
        </div>
        <button
          type="button"
          className="btn btn-primary reserve-mobile-bar-cta"
          disabled={loading || !selectedSlot}
          onClick={submit}
        >
          {loading ? '…' : recurring ? 'پرداخت' : 'ثبت رزرو'}
        </button>
      </div>
    </div>
  );
}
