'use client';

import Link from 'next/link';
import { VenueImage } from '@/components/VenueImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/fetch-api';
import { savePendingBooking } from '@/lib/booking-pending';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { CATEGORY_LABEL } from '@/data/venues';
import { isDemoFrontend } from '@/lib/demo';
import { getToken, getUser } from '@/lib/session';
import { JalaliDatePicker } from '@/components/JalaliDatePicker';
import { StepperInput } from '@/components/form/StepperInput';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import { numFa, todayLocalDay, toJalaliApiDate, toJalaliString } from '@/lib/jalali';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { buildDemoSlotsForPitch } from '@/lib/flash-deals';

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
};

const SLOT_FA: Record<string, string> = {
  free: 'آزاد',
  locked: 'در حال رزرو',
  booked: 'رزرو شده',
  blocked: 'غیرفعال',
  past: 'گذشته',
};

function slotStatus(s: Slot): string {
  if (s.displayStatus) return s.displayStatus;
  if (s.bookable === false && !s.taken) return 'blocked';
  return s.taken ? 'booked' : 'free';
}

function slotDisabled(s: Slot): boolean {
  const st = slotStatus(s);
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
  const [showPastSlots, setShowPastSlots] = useState(false);

  useEffect(() => {
    setDate(todayLocalDay());
    const u = getUser();
    if (u) {
      setName(u.name);
      setPhone(u.phone);
    }
    void fetchCatalog().then(({ items }) => {
      setCatalog(items);
      const fromUrl = pitchIdFromUrl
        ? items.find((x) => x.pitchId === pitchIdFromUrl)
        : null;
      const fromSlug = venueSlug ? items.find((x) => x.slug === venueSlug) : null;
      const first = fromUrl || fromSlug || items[0];
      if (first) setPitchId(first.pitchId);
      setCatalogReady(true);
    });
  }, [venueSlug, pitchIdFromUrl]);

  useEffect(() => {
    if (!pitchId || !date) return;
    setSlotIndex(null);
    setSlotView('bookable');
    setSlotsLoading(true);

    const load = () => {
      if (pitchId.startsWith('demo-') || isDemoFrontend()) {
        void buildDemoSlotsForPitch(pitchId, date)
          .then(setSlots)
          .finally(() => setSlotsLoading(false));
        return;
      }
      const apiDate = toJalaliApiDate(date);
      void apiFetch<{ success: boolean; slots: Slot[] }>(
        `/pitches/${pitchId}/slots?date=${encodeURIComponent(apiDate)}`,
      )
        .then((data) => {
          if (data.success) setSlots(data.slots);
        })
        .catch(() => void buildDemoSlotsForPitch(pitchId, date).then(setSlots))
        .finally(() => setSlotsLoading(false));
    };

    load();
    const tick = window.setInterval(load, 60_000);
    return () => window.clearInterval(tick);
  }, [pitchId, date]);

  useEffect(() => {
    const raw = search.get('slot');
    if (raw == null || !slots.length) return;
    const idx = parseInt(raw, 10);
    if (Number.isNaN(idx)) return;
    const target = slots.find((s) => s.slotIndex === idx);
    if (target && !slotDisabled(target)) setSlotIndex(idx);
  }, [search, slots]);

  const selectedVenue = useMemo(
    () => catalog.find((v) => v.pitchId === pitchId),
    [catalog, pitchId],
  );

  const filteredCatalog = useMemo(() => {
    if (pitchFilter === 'all') return catalog;
    return catalog.filter((v) => v.category === pitchFilter);
  }, [catalog, pitchFilter]);

  const selectedSlot = slotIndex != null ? slots.find((s) => s.slotIndex === slotIndex) : null;
  const amount = selectedSlot?.sitePrice ?? selectedSlot?.price ?? 0;
  const freeCount = slots.filter((s) => !slotDisabled(s)).length;

  const visibleSlots = useMemo(() => {
    return slots.filter((s) => {
      const st = slotStatus(s);
      const isPast = st === 'past';
      if (!showPastSlots && isPast) return false;
      if (slotView === 'bookable') return !slotDisabled(s);
      if (slotView === 'all') return true;
      return slotDayPart(s.slotIndex) === slotView;
    });
  }, [slots, slotView, showPastSlots]);

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
        name,
        phone,
        amount: String(data.totalAmount || 0),
      });
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
    if (sel && slotDisabled(sel)) {
      setErr('این سانس قابل رزرو نیست.');
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
        <div>
          <p className="eyebrow">رزرو آنلاین</p>
          <h1>انتخاب مجموعه، تاریخ و سانس</h1>
          <p className="subtitle">
            {toJalaliString(date)} · {numFa(freeCount)} سانس آزاد در این روز
          </p>
        </div>
        <Link href="/gallery" className="btn btn-ghost btn-sm">
          مشاهده همه زمین‌ها
        </Link>
      </header>

      <ol className="reserve-progress" aria-label="مراحل رزرو">
        <li className={step >= 1 ? 'active' : ''}>
          <span className="reserve-progress-num">۱</span>
          <span>مجموعه</span>
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
              <h2>مجموعه</h2>
              <div className="reserve-type-chips chip-scroll-wrap">
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
            <div className="reserve-pitch-select-mobile field">
              <label htmlFor="reserve-pitch-select">انتخاب سریع مجموعه</label>
              <select
                id="reserve-pitch-select"
                value={pitchId}
                onChange={(e) => setPitchId(e.target.value)}
              >
                {filteredCatalog.map((v) => (
                  <option key={v.pitchId} value={v.pitchId}>
                    {v.name} — از {priceFa(v.priceFrom)} تومان
                  </option>
                ))}
              </select>
            </div>
            <div
              className="reserve-pitch-picker scroll-y-right"
              role="listbox"
              aria-label="انتخاب مجموعه"
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
              <p className="reserve-venue-link muted-sm">
                <Link href={`/gallery/${selectedVenue.slug}`}>جزئیات {selectedVenue.name}</Link>
                {' · '}
                {selectedVenue.address}، {selectedVenue.city}
              </p>
            )}
          </section>

          <section className="reserve-block panel">
            <h2>تاریخ</h2>
            <JalaliDatePicker value={date} onChange={setDate} />
          </section>

          <section className="reserve-block panel">
            <div className="reserve-block-head">
              <h2>سانس‌های {selectedVenue?.name || 'مجموعه'}</h2>
            </div>
            <div className="slot-legend">
              <span className="slot-chip state-free">آزاد</span>
              <span className="slot-chip state-reserved">رزرو شده</span>
              <span className="slot-chip state-blocked">غیرفعال</span>
            </div>
            <div className="slot-view-chips chip-scroll-wrap" role="tablist" aria-label="فیلتر سانس">
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
            <label className="checkbox-line reserve-past-toggle">
              <input
                type="checkbox"
                checked={showPastSlots}
                onChange={(e) => setShowPastSlots(e.target.checked)}
              />
              نمایش سانس‌های گذشته
            </label>
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
                  const st = slotStatus(s);
                  const disabled = slotDisabled(s);
                  const selected = slotIndex === s.slotIndex;
                  const stateClass =
                    st === 'free'
                      ? 'state-free'
                      : st === 'past' || st === 'booked' || st === 'locked'
                        ? 'state-reserved'
                        : 'state-blocked';
                  return (
                    <button
                      key={s.slotIndex}
                      type="button"
                      disabled={disabled}
                      className={`slot-day-card ${stateClass}${selected ? ' selected' : ''}`}
                      onClick={() => setSlotIndex(s.slotIndex)}
                    >
                      <span className="slot-day-time">{s.time}</span>
                      {s.flashDeal && s.originalSitePrice != null && (
                        <span className="slot-day-flash">
                          لحظه‌آخر {numFa(s.discountPercent ?? 0)}٪
                        </span>
                      )}
                      <span className="slot-day-price">
                        {s.flashDeal && s.originalSitePrice != null && (
                          <span className="slot-day-price-old">
                            {priceFa(s.originalSitePrice)}
                          </span>
                        )}
                        {priceFa(s.sitePrice ?? s.price ?? 0)} تومان
                      </span>
                      <span className={`slot-day-state slot-chip ${stateClass}`}>
                        {SLOT_FA[st] || st}
                      </span>
                    </button>
                  );
                })}
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
              <dd>{selectedSlot?.time || 'انتخاب نشده'}</dd>
            </div>
            <div className="reserve-summary-total">
              <dt>مبلغ</dt>
              <dd>{selectedSlot ? `${priceFa(amount)} تومان` : '—'}</dd>
            </div>
          </dl>
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

      <div className="reserve-mobile-bar">
        <div>
          <span className="muted-sm">مبلغ</span>
          <strong>{selectedSlot ? priceFa(amount) : '—'}</strong>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={loading || !selectedSlot}
          onClick={submit}
        >
          {recurring ? 'پرداخت' : 'ادامه'}
        </button>
      </div>
    </div>
  );
}
