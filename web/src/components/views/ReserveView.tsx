'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VENUES } from '@/data/venues';
import { apiFetch } from '@/lib/fetch-api';
import { getToken, getUser } from '@/lib/session';
import { toJalaliApiDate, toJalaliString } from '@/lib/jalali';
import { priceFa } from '@/lib/format';

type Pitch = { _id: string; name: string; type: string; size: number };
type Slot = {
  slotIndex: number;
  time: string;
  sitePrice?: number;
  price?: number;
  taken: boolean;
};

export function ReserveView() {
  const router = useRouter();
  const search = useSearchParams();
  const venueSlug = search.get('venue');

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [pitchId, setPitchId] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotIndex, setSlotIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(5);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setName(u.name);
      setPhone(u.phone);
    }
    void (async () => {
      try {
        const data = await apiFetch<{ success: boolean; pitches: Pitch[] }>('/pitches');
        if (data.success && data.pitches.length) {
          setPitches(data.pitches);
          const match = venueSlug
            ? VENUES.find((v) => v.slug === venueSlug)
            : null;
          const byName = match
            ? data.pitches.find((p) => p.name.includes(match.name.split(' ')[0]))
            : null;
          setPitchId(byName?._id || data.pitches[0]._id);
          return;
        }
      } catch {
        /* fallback */
      }
      setPitches(
        VENUES.map((v) => ({
          _id: `demo-${v.id}`,
          name: v.name,
          type: v.category === 'grass' ? 'grass' : 'futsal',
          size: v.size,
        })),
      );
      const v0 = venueSlug ? VENUES.find((x) => x.slug === venueSlug) : VENUES[0];
      setPitchId(v0 ? `demo-${v0.id}` : 'demo-1');
    })();
  }, [venueSlug]);

  useEffect(() => {
    if (!pitchId) return;
    if (pitchId.startsWith('demo-')) {
      setSlots([
        { slotIndex: 0, time: '۱۸:۰۰–۱۹:۳۰', sitePrice: 520000, taken: false },
        { slotIndex: 1, time: '۱۹:۳۰–۲۱:۰۰', sitePrice: 520000, taken: false },
        { slotIndex: 2, time: '۲۱:۰۰–۲۲:۳۰', sitePrice: 580000, taken: true },
      ]);
      return;
    }
    const apiDate = toJalaliApiDate(date);
    void apiFetch<{ success: boolean; slots: Slot[] }>(
      `/pitches/${pitchId}/slots?date=${encodeURIComponent(apiDate)}`,
    ).then((data) => {
      if (data.success) setSlots(data.slots);
    });
  }, [pitchId, date]);

  const selectedSlot = slotIndex != null ? slots.find((s) => s.slotIndex === slotIndex) : null;
  const amount = selectedSlot?.sitePrice ?? selectedSlot?.price ?? 0;

  async function submit() {
    setErr('');
    if (!getToken()) {
      router.push('/login?redirect=/reserve');
      return;
    }
    if (!pitchId || slotIndex == null) {
      setErr('سانس را انتخاب کنید');
      return;
    }
    if (name.trim().length < 2 || !/^09[0-9]{9}$/.test(phone)) {
      setErr('نام و شماره موبایل معتبر وارد کنید');
      return;
    }

    setLoading(true);
    const apiDate = toJalaliApiDate(date);
    const pitchName = pitches.find((p) => p._id === pitchId)?.name || '';

    try {
      if (pitchId.startsWith('demo-')) {
        const mockId = 'mock-' + Date.now();
        const q = new URLSearchParams({
          reservationId: mockId,
          pitchName,
          date: apiDate,
          time: selectedSlot?.time || '',
          name,
          phone,
          count: String(count),
          amount: String(amount),
        });
        router.push(`/payment?${q.toString()}`);
        return;
      }

      const data = await apiFetch<{
        success: boolean;
        message?: string;
        reservation?: { id: string; amount: number };
      }>('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          pitchId,
          slotIndex,
          date: apiDate,
          playerCount: count,
        }),
      });
      if (!data.success || !data.reservation) throw new Error(data.message);
      const q = new URLSearchParams({
        reservationId: data.reservation.id,
        pitchName,
        date: apiDate,
        time: selectedSlot?.time || '',
        name,
        phone,
        count: String(count),
        amount: String(data.reservation.amount),
      });
      router.push(`/payment?${q.toString()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در ثبت رزرو');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-hero">
        <p className="eyebrow">رزرو سانس</p>
        <h1>انتخاب مجموعه، تاریخ و ساعت</h1>
        <p className="subtitle">{toJalaliString(date)}</p>
      </header>

      <div className="reserve-steps">
        <div className="panel">
          <h2>۱. مجموعه و تاریخ</h2>
          <div className="field">
            <label>مجموعه</label>
            <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
              {pitches.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>تاریخ (میلادی — برای انتخاب روز)</label>
            <input
              type="date"
              value={date.toISOString().slice(0, 10)}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
          </div>
        </div>

        <div className="panel">
          <h2>۲. سانس و اطلاعات</h2>
          <div className="slot-grid">
            {slots.map((s) => (
              <button
                key={s.slotIndex}
                type="button"
                disabled={s.taken}
                className={
                  slotIndex === s.slotIndex ? 'slot-btn selected' : 'slot-btn'
                }
                onClick={() => setSlotIndex(s.slotIndex)}
              >
                {s.time}
                <br />
                {priceFa(s.sitePrice ?? s.price ?? 0)}
              </button>
            ))}
          </div>
          <div className="field">
            <label>نام</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>موبایل</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>تعداد نفرات</label>
            <input
              type="number"
              min={1}
              max={22}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 5)}
            />
          </div>
          {err && <p className="form-msg err">{err}</p>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={submit}
          >
            ادامه به پرداخت
          </button>
        </div>
      </div>
    </div>
  );
}
