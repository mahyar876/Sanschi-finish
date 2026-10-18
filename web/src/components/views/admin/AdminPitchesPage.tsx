'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  ListToolbar,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import type { Pitch } from '@/lib/pitch-types';
import { fetchAllPitches, removePitch, reorderPitch, updatePitch } from '@/lib/pitch-service';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import { PitchImageUpload } from '@/components/form/PitchImageUpload';
import { WomenBookingSelect } from '@/components/form/WomenBookingSelect';
import { AmenityChecklist } from '@/components/form/AmenityChecklist';
import { normalizeAmenityIds, type PitchAmenityId } from '@/lib/pitch-amenities';
import { isValidCoord } from '@/lib/google-maps';

const TYPE_LABEL = { futsal: 'فوتسال', grass: 'چمن' };

export function AdminPitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [query, setQuery] = useState('');
  const [noLocationOnly, setNoLocationOnly] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetchAllPitches().then(setPitches);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = pitches.filter((p) => {
    if (noLocationOnly && isValidCoord(p.lat ?? undefined, p.lng ?? undefined)) return false;
    if (!query.trim()) return true;
    return p.name.includes(query) || p.address.includes(query);
  });

  async function saveOne(p: Pitch) {
    setSaving(p._id);
    setMsg('');
    try {
      await updatePitch(p._id, {
        name: p.name,
        type: p.type,
        size: p.size,
        price: p.price,
        address: p.address,
        desc: p.desc,
        tags: p.tags,
        image: p.image,
        isActive: p.isActive,
        commissionAmount: p.commissionAmount,
        slots: p.slots,
        lat: p.lat,
        lng: p.lng,
        sortOrder: p.sortOrder,
        womenBookingAllowed: p.womenBookingAllowed ?? null,
        rulesText: p.rulesText ?? '',
        amenities: p.amenities ?? [],
        maxCapacity: p.maxCapacity ?? null,
      });
      setMsg(`✓ «${p.name}» ذخیره شد`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setSaving(null);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`حذف «${name}»؟`)) return;
    await removePitch(id);
    load();
  }

  function patchLocal(id: string, patch: Partial<Pitch>) {
    setPitches((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  }

  return (
    <>
      <PageIntro
        title="مدیریت زمین‌ها"
        description="ویرایش اطلاعات، لوکیشن، کارمزد و وضعیت نمایش هر مجموعه."
      />
      {msg && <p className="notice">{msg}</p>}
      <ActionsPanel title="فیلتر">
        <ListToolbar
          searchPlaceholder="نام یا آدرس…"
          searchValue={query}
          onSearchChange={setQuery}
        />
        <label className="checkbox-line" style={{ marginTop: '0.75rem' }}>
          <input
            type="checkbox"
            checked={noLocationOnly}
            onChange={(e) => setNoLocationOnly(e.target.checked)}
          />
          فقط زمین‌های بدون موقعیت روی نقشه
        </label>
      </ActionsPanel>
      <DataSection title={`مجموعه‌ها (${filtered.length})`}>
        <div className="pitch-admin-grid">
          {filtered.map((p) => (
            <article key={p._id} className="pitch-admin-card panel">
              {!isValidCoord(p.lat ?? undefined, p.lng ?? undefined) && (
                <p className="form-msg venue-map-missing-badge" role="status">
                  موقعیت روی نقشه ثبت نشده
                </p>
              )}
              <PitchImageUpload
                image={p.image}
                onImageChange={(image) => patchLocal(p._id, { image })}
                onError={setMsg}
              />
              <div className="pitch-admin-card-top">
                <div className="pitch-admin-order">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void reorderPitch(p._id, -1).then(load)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void reorderPitch(p._id, 1).then(load)}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="field">
                <label>نام</label>
                <input
                  value={p.name}
                  onChange={(e) => patchLocal(p._id, { name: e.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>نوع</label>
                  <select
                    value={p.type}
                    onChange={(e) =>
                      patchLocal(p._id, { type: e.target.value as Pitch['type'] })
                    }
                  >
                    <option value="futsal">فوتسال</option>
                    <option value="grass">چمن</option>
                  </select>
                </div>
                <div className="field">
                  <label>سایز زمین</label>
                  <select
                    value={p.size}
                    onChange={(e) =>
                      patchLocal(p._id, { size: parseInt(e.target.value, 10) as Pitch['size'] })
                    }
                  >
                    <option value={5}>{pitchSizeLabel(5)}</option>
                    <option value={7}>{pitchSizeLabel(7)}</option>
                    <option value={11}>{pitchSizeLabel(11)}</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>قیمت پایه (تومان)</label>
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => patchLocal(p._id, { price: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="field">
                <label>کارمزد سانس‌چی (تومان)</label>
                <input
                  type="number"
                  value={p.commissionAmount}
                  onChange={(e) =>
                    patchLocal(p._id, {
                      commissionAmount: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>آدرس</label>
                <input
                  value={p.address}
                  onChange={(e) => patchLocal(p._id, { address: e.target.value })}
                />
              </div>
              <MapLocationPicker
                lat={p.lat}
                lng={p.lng}
                addressHint={p.address}
                onChange={(coords) =>
                  patchLocal(p._id, { lat: coords.lat ?? null, lng: coords.lng ?? null })
                }
              />
              <div className="field">
                <label>درباره مجموعه</label>
                <textarea
                  rows={3}
                  value={p.desc || ''}
                  onChange={(e) => patchLocal(p._id, { desc: e.target.value })}
                />
              </div>
              <div className="field">
                <label>قوانین مجموعه</label>
                <textarea
                  rows={3}
                  value={p.rulesText || ''}
                  onChange={(e) => patchLocal(p._id, { rulesText: e.target.value })}
                />
              </div>
              <AmenityChecklist
                compact
                value={normalizeAmenityIds(p.amenities)}
                onChange={(amenities: PitchAmenityId[]) => patchLocal(p._id, { amenities })}
              />
              <WomenBookingSelect
                value={p.womenBookingAllowed}
                onChange={(womenBookingAllowed) =>
                  patchLocal(p._id, { womenBookingAllowed })
                }
              />
              <div className="field">
                <label>تگ‌ها (با ویرگول)</label>
                <input
                  value={p.tags.join('، ')}
                  onChange={(e) =>
                    patchLocal(p._id, {
                      tags: e.target.value.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={p.isActive}
                  onChange={(e) => patchLocal(p._id, { isActive: e.target.checked })}
                />
                فعال در سایت ({TYPE_LABEL[p.type]} · {pitchSizeLabel(p.size)} · از {priceFa(p.price)})
              </label>
              <div className="pitch-admin-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving === p._id}
                  onClick={() => void saveOne(p)}
                >
                  {saving === p._id ? '…' : 'اعمال تغییرات'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger, #ef4444)' }}
                  onClick={() => void onDelete(p._id, p.name)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      </DataSection>
    </>
  );
}
