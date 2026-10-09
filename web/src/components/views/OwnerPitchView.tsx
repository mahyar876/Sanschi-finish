'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoOwnerPitches } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import type { Pitch } from '@/lib/pitch-types';
import { fetchPitch, updatePitch } from '@/lib/pitch-service';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import { PitchImageUpload } from '@/components/form/PitchImageUpload';
import { LAST_MINUTE_PLATFORM_DEFAULTS } from '@/lib/last-minute-pricing';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';

export function OwnerPitchView() {
  const search = useSearchParams();
  const [pitchId, setPitchId] = useState('');
  const [pitches, setPitches] = useState<{ _id: string; name: string }[]>([]);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isDemoFrontend()) {
      const list = getDemoOwnerPitches();
      setPitches(list);
      setPitchId(list[0]?._id || '');
      return;
    }
    void apiFetch<{ success: boolean; pitches: typeof pitches }>('/owner/pitches').then((d) => {
      if (d.success && d.pitches.length) {
        setPitches(d.pitches);
        setPitchId(d.pitches[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    const q = search.get('pitch');
    if (q) setPitchId(q);
  }, [search]);

  const loadPitch = useCallback(() => {
    if (!pitchId) return;
    void fetchPitch(pitchId).then(setPitch);
  }, [pitchId]);

  useEffect(() => {
    loadPitch();
  }, [loadPitch]);

  async function save() {
    if (!pitch) return;
    if (isDemoFrontend()) {
      await updatePitch(pitch._id, {
        address: pitch.address,
        desc: pitch.desc,
        slots: pitch.slots,
        price: pitch.price,
        tags: pitch.tags,
        isActive: pitch.isActive,
        image: pitch.image,
        lat: pitch.lat,
        lng: pitch.lng,
        lastMinuteEnabled: pitch.lastMinuteEnabled,
        lastMinuteDiscount60: pitch.lastMinuteDiscount60,
        lastMinuteDiscount30: pitch.lastMinuteDiscount30,
        lastMinuteMaxPct: pitch.lastMinuteMaxPct,
      });
    } else {
      await apiFetch(`/owner/pitches/${pitch._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          address: pitch.address,
          desc: pitch.desc,
          slots: pitch.slots,
          price: pitch.price,
          tags: pitch.tags,
          isActive: pitch.isActive,
          image: pitch.image,
          lat: pitch.lat,
          lng: pitch.lng,
          lastMinuteEnabled: pitch.lastMinuteEnabled,
          lastMinuteDiscount60: pitch.lastMinuteDiscount60,
          lastMinuteDiscount30: pitch.lastMinuteDiscount30,
          lastMinuteMaxPct: pitch.lastMinuteMaxPct,
        }),
      });
    }
    setMsg('✓ ذخیره شد');
  }

  return (
    <>
      <PageIntro
        title="ویرایش زمین"
        description="اطلاعات، امکانات، قیمت پایه و وضعیت فعال بودن. سانس‌های روزانه در بخش مدیریت سانس‌ها."
      >
        <Link href="/owner/pitches" className="btn btn-ghost btn-sm">
          بازگشت به لیست
        </Link>
      </PageIntro>
      {msg && <p className="notice">{msg}</p>}
      {pitches.length > 0 && (
        <ActionsPanel>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>مجموعه</label>
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
          <ActionsPanel title="عکس زمین" description="در گالری و صفحه رزرو نمایش داده می‌شود.">
            <PitchImageUpload
              image={pitch.image}
              onImageChange={(image) => setPitch({ ...pitch, image })}
              onError={setMsg}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
              ذخیره عکس
            </button>
          </ActionsPanel>
          <ActionsPanel title="اطلاعات پایه">
            <div className="field">
              <label>قیمت پایه (تومان)</label>
              <input
                type="number"
                value={pitch.price}
                onChange={(e) =>
                  setPitch({ ...pitch, price: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="field">
              <label>آدرس</label>
              <input
                value={pitch.address}
                onChange={(e) => setPitch({ ...pitch, address: e.target.value })}
              />
            </div>
            <div className="field">
              <label>توضیحات و امکانات</label>
              <textarea
                rows={3}
                value={pitch.desc || ''}
                onChange={(e) => setPitch({ ...pitch, desc: e.target.value })}
                placeholder="ساعات کاری، پارکینگ، رختکن، چمن…"
              />
            </div>
            <div className="field">
              <label>برچسب‌ها (با ویرگول)</label>
              <input
                value={(pitch.tags || []).join('، ')}
                onChange={(e) =>
                  setPitch({
                    ...pitch,
                    tags: e.target.value
                      .split(/[,،]/)
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={pitch.isActive}
                onChange={(e) => setPitch({ ...pitch, isActive: e.target.checked })}
              />
              زمین فعال و قابل رزرو در سایت
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
              ذخیره
            </button>
          </ActionsPanel>
          <ActionsPanel
            title="تخفیف لحظه‌آخر"
            description="اگر تا شروع سانس کمتر از ۱ ساعت مانده و هنوز خالی است، قیمت نمایشی برای بازیکن کاهش می‌یابد و در صفحه اصلی اولویت دارد."
          >
            <ToggleSwitch
              label="فعال برای این زمین"
              checked={pitch.lastMinuteEnabled !== false}
              onChange={(on) => setPitch({ ...pitch, lastMinuteEnabled: on })}
            />
            <div className="field-row">
              <div className="field">
                <label>
                  تخفیف وقتی ≤۱ ساعت مانده (٪)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={String(LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent60Min)}
                  value={pitch.lastMinuteDiscount60 ?? ''}
                  onChange={(e) =>
                    setPitch({
                      ...pitch,
                      lastMinuteDiscount60: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>تخفیف وقتی ≤۳۰ دقیقه مانده (٪)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={String(LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent30Min)}
                  value={pitch.lastMinuteDiscount30 ?? ''}
                  onChange={(e) =>
                    setPitch({
                      ...pitch,
                      lastMinuteDiscount30: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                />
              </div>
            </div>
            <p className="muted-sm">
              خالی = پیش‌فرض پلتفرم ({LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent60Min}٪ /{' '}
              {LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent30Min}٪). سقف کلی{' '}
              {LAST_MINUTE_PLATFORM_DEFAULTS.maxDiscountPercent}٪.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
              ذخیره
            </button>
          </ActionsPanel>
          <ActionsPanel
            title="موقعیت روی نقشه"
            description="محل دقیق مجموعه برای نمایش در سایت و مسیریابی بازیکن در Google Maps."
          >
            <MapLocationPicker
              lat={pitch.lat}
              lng={pitch.lng}
              addressHint={pitch.address}
              onChange={(coords) =>
                setPitch({
                  ...pitch,
                  lat: coords.lat,
                  lng: coords.lng,
                })
              }
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
              ذخیره موقعیت
            </button>
          </ActionsPanel>
          <ActionsPanel title="سانس‌ها">
            <p className="muted-sm" style={{ margin: '0 0 0.5rem' }}>
              برای ویرایش تقویم روزانه، قیمت دسته‌جمعی و وضعیت آزاد/رزرو از مدیریت سانس استفاده
              کنید.
            </p>
            <Link href={`/owner/slots?pitch=${pitch._id}`} className="btn btn-secondary btn-sm">
              مدیریت سانس‌ها
            </Link>
          </ActionsPanel>
        </>
      )}
    </>
  );
}
