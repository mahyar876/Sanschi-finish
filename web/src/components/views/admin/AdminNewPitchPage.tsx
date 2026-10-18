'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { pitchSizeLabel } from '@/lib/format';
import { createPitch } from '@/lib/pitch-service';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import { PitchImageUpload } from '@/components/form/PitchImageUpload';
import { WomenBookingSelect } from '@/components/form/WomenBookingSelect';

export function AdminNewPitchPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'futsal' | 'grass'>('futsal');
  const [size, setSize] = useState<5 | 7 | 11>(5);
  const [price, setPrice] = useState(550_000);
  const [address, setAddress] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [womenBookingAllowed, setWomenBookingAllowed] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const p = await createPitch({
        name,
        type,
        size,
        price,
        address,
        desc,
        tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        image,
        lat,
        lng,
        isActive: true,
        commissionAmount: 45_000,
        womenBookingAllowed,
      });
      setMsg('✓ زمین ثبت شد');
      router.push('/admin/pitches');
      router.refresh();
      void p;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        title="افزودن زمین جدید"
        description="پس از ثبت، در گالری و رزرو (با API یا دمو) قابل نمایش است."
      />
      <ActionsPanel>
        <form onSubmit={submit} className="form-stack">
          <PitchImageUpload image={image} onImageChange={setImage} onError={setMsg} />
          <div className="field">
            <label>نام</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>نوع</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="futsal">فوتسال</option>
                <option value="grass">چمن</option>
              </select>
            </div>
            <div className="field">
              <label>سایز زمین</label>
              <select
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10) as typeof size)}
              >
                <option value={5}>{pitchSizeLabel(5)}</option>
                <option value={7}>{pitchSizeLabel(7)}</option>
                <option value={11}>{pitchSizeLabel(11)}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>قیمت پایه</label>
            <input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field">
            <label>آدرس</label>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <MapLocationPicker
            lat={lat}
            lng={lng}
            addressHint={address}
            onChange={(coords) => {
              setLat(coords.lat);
              setLng(coords.lng);
            }}
          />
          <div className="field">
            <label>توضیحات</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <WomenBookingSelect
            value={womenBookingAllowed}
            onChange={setWomenBookingAllowed}
          />
          <div className="field">
            <label>تگ‌ها</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="سرپوشیده، پارکینگ" />
          </div>
          {msg && <p className="notice">{msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            ثبت زمین
          </button>
        </form>
      </ActionsPanel>
    </>
  );
}
