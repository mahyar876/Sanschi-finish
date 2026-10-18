'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ActionsPanel } from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { getToken } from '@/lib/session';
import type { Pitch } from '@/lib/pitch-types';
import { fetchPitchForOwner, updatePitch } from '@/lib/pitch-service';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import { PitchImageUpload } from '@/components/form/PitchImageUpload';
import { LAST_MINUTE_PLATFORM_DEFAULTS } from '@/lib/last-minute-pricing';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import { WomenBookingSelect } from '@/components/form/WomenBookingSelect';
import { AmenityChecklist } from '@/components/form/AmenityChecklist';
import { normalizeAmenityIds, type PitchAmenityId } from '@/lib/pitch-amenities';

type Props = {
  pitchId: string;
  onSaved?: () => void;
};

function digitsOnly(raw: string, maxLen = 3): string {
  return raw.replace(/[^\d]/g, '').slice(0, maxLen);
}

function percentFromDigits(digits: string): number | null {
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function OwnerPitchEditor({ pitchId, onSaved }: Props) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [lm60Text, setLm60Text] = useState('');
  const [lm30Text, setLm30Text] = useState('');

  const reload = useCallback(() => {
    if (!pitchId) return;
    setLoading(true);
    void fetchPitchForOwner(pitchId)
      .then(setPitch)
      .finally(() => setLoading(false));
  }, [pitchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!pitch) return;
    const d60 = pitch.lastMinuteDiscount60;
    const d30 = pitch.lastMinuteDiscount30;
    setLm60Text(
      d60 != null && Number.isFinite(Number(d60)) ? String(Math.round(Number(d60))) : '',
    );
    setLm30Text(
      d30 != null && Number.isFinite(Number(d30)) ? String(Math.round(Number(d30))) : '',
    );
  }, [pitchId, pitch?._id]);

  async function persistPatch(base: Pitch, body: Partial<Pitch>, okMsg = '✓ ذخیره شد') {
    setMsg('');
    const demoSession = isDemoFrontend() || getToken()?.startsWith('demo-token');
    try {
      if (demoSession) {
        const next = await updatePitch(base._id, body);
        setPitch(next);
      } else {
        const data = await apiFetch<{ success: boolean; pitch: Pitch }>(
          `/owner/pitches/${base._id}`,
          { method: 'PATCH', body: JSON.stringify(body) },
        );
        if (data.pitch) {
          setPitch((p) => (p ? { ...p, ...data.pitch, _id: p._id } : p));
        }
      }
      setMsg(okMsg);
      onSaved?.();
    } catch {
      setMsg('ذخیره نشد — دوباره تلاش کنید');
    }
  }

  async function save() {
    if (!pitch) return;
    await persistPatch(pitch, {
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
      womenBookingAllowed: pitch.womenBookingAllowed ?? null,
      rulesText: pitch.rulesText ?? '',
      amenities: pitch.amenities ?? [],
      maxCapacity: pitch.maxCapacity ?? null,
    });
  }

  function setLastMinuteEnabled(on: boolean) {
    setPitch((p) => {
      if (!p) return p;
      const next = { ...p, lastMinuteEnabled: on };
      void persistPatch(
        next,
        {
          lastMinuteEnabled: on,
          lastMinuteDiscount60: p.lastMinuteDiscount60 ?? null,
          lastMinuteDiscount30: p.lastMinuteDiscount30 ?? null,
          lastMinuteMaxPct: p.lastMinuteMaxPct ?? null,
        },
        on ? 'تخفیف لحظه‌آخر فعال شد' : 'تخفیف لحظه‌آخر غیرفعال شد',
      );
      return next;
    });
  }

  if (loading) {
    return <p className="muted-sm">در حال بارگذاری…</p>;
  }

  if (!pitch) {
    return <p className="notice">زمین پیدا نشد.</p>;
  }

  return (
    <>
      {msg && <p className="notice">{msg}</p>}
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
        <WomenBookingSelect
          value={pitch.womenBookingAllowed}
          onChange={(womenBookingAllowed) =>
            setPitch({ ...pitch, womenBookingAllowed })
          }
          hint="در گالری و لیست زمین‌ها نمایش داده می‌شود."
        />
        <div className="field">
          <label>حداکثر نفرات در سانس (اختیاری)</label>
          <input
            type="number"
            min={1}
            max={99}
            value={pitch.maxCapacity ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setPitch({
                ...pitch,
                maxCapacity: v === '' ? null : Math.min(99, parseInt(v, 10) || 0) || null,
              });
            }}
            placeholder="مثلاً ۱۶"
          />
        </div>
        <AmenityChecklist
          value={normalizeAmenityIds(pitch.amenities)}
          onChange={(amenities: PitchAmenityId[]) =>
            setPitch((p) => (p ? { ...p, amenities } : p))
          }
          compact
        />
        <div className="field">
          <label>درباره مجموعه</label>
          <textarea
            rows={5}
            value={pitch.desc || ''}
            onChange={(e) => setPitch({ ...pitch, desc: e.target.value })}
            placeholder="هر خط یک بند — نوع زمین، امکانات، نکات مهم برای بازیکن…"
          />
        </div>
        <div className="field">
          <label>قوانین مجموعه</label>
          <textarea
            rows={5}
            value={pitch.rulesText || ''}
            onChange={(e) => setPitch({ ...pitch, rulesText: e.target.value })}
            placeholder="هر خط یک قانون — بیمه ورزشی، کفش، ظرفیت، کنسلی…"
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
        description="اگر تا شروع سانس کمتر از ۱ ساعت مانده و هنوز خالی است، قیمت نمایشی برای بازیکن کاهش می‌یابد."
      >
        <ToggleSwitch
          id="pitch-last-minute-enabled"
          label="فعال برای این زمین"
          checked={pitch.lastMinuteEnabled !== false}
          onChange={setLastMinuteEnabled}
        />
        <div className="field-row">
          <div className="field">
            <label htmlFor="lm-discount-60">تخفیف وقتی ≤۱ ساعت مانده (٪)</label>
            <input
              id="lm-discount-60"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="owner-percent-input"
              placeholder={`پیش‌فرض ${LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent60Min}`}
              value={lm60Text}
              onChange={(e) => {
                const digits = digitsOnly(e.target.value);
                setLm60Text(digits);
                setPitch({
                  ...pitch,
                  lastMinuteDiscount60: percentFromDigits(digits),
                });
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="lm-discount-30">تخفیف وقتی ≤۳۰ دقیقه مانده (٪)</label>
            <input
              id="lm-discount-30"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="owner-percent-input"
              placeholder={`پیش‌فرض ${LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent30Min}`}
              value={lm30Text}
              onChange={(e) => {
                const digits = digitsOnly(e.target.value);
                setLm30Text(digits);
                setPitch({
                  ...pitch,
                  lastMinuteDiscount30: percentFromDigits(digits),
                });
              }}
            />
          </div>
        </div>
        <p className="muted-sm owner-lm-hint">
          اگر خالی بگذارید، پیش‌فرض پلتفرم ({LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent60Min}٪ /{' '}
          {LAST_MINUTE_PLATFORM_DEFAULTS.discountPercent30Min}٪) اعمال می‌شود.
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
          ذخیره
        </button>
      </ActionsPanel>
      <ActionsPanel title="موقعیت روی نقشه">
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
        <Link href={`/owner/slots?pitch=${pitch._id}`} className="btn btn-secondary btn-sm">
          مدیریت سانس‌ها
        </Link>
      </ActionsPanel>
    </>
  );
}
