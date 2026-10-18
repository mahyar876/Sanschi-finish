'use client';



import { useEffect, useMemo, useState } from 'react';

import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';

import { JalaliDatePicker } from '@/components/JalaliDatePicker';

import { StepperInput } from '@/components/form/StepperInput';

import { numFa, toJalaliString } from '@/lib/jalali';

import { fetchAllPitches } from '@/lib/pitch-service';

import type { Pitch } from '@/lib/pitch-types';

import {

  fetchAdminSiteSettings,

  HOME_FEATURED_PLACEMENTS_MAX,

  HOME_VENUE_PREVIEW_MAX,

  HOME_VENUE_PREVIEW_MIN,

  saveAdminSiteSettings,

  SITE_SETTINGS_DEFAULTS,

  type HomeFeaturedPlacement,

} from '@/lib/site-settings';



function defaultPlacementExpiry(daysAhead = 30): Date {

  const d = new Date();

  d.setDate(d.getDate() + daysAhead);

  d.setHours(23, 59, 59, 999);

  return d;

}



function reorderPlacements(list: HomeFeaturedPlacement[]): HomeFeaturedPlacement[] {

  return list.map((p, i) => ({ ...p, sortOrder: i }));

}



export function AdminSiteSettingsView() {

  const [homeVenuePreviewCount, setHomeVenuePreviewCount] = useState(

    SITE_SETTINGS_DEFAULTS.homeVenuePreviewCount,

  );

  const [placements, setPlacements] = useState<HomeFeaturedPlacement[]>([]);

  const [pitches, setPitches] = useState<Pitch[]>([]);

  const [newPitchId, setNewPitchId] = useState('');

  const [newExpiry, setNewExpiry] = useState<Date>(() => defaultPlacementExpiry());

  const [newNote, setNewNote] = useState('');

  const [msg, setMsg] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [supportEmail, setSupportEmail] = useState('support@sanschii.ir');

  const [supportPhone, setSupportPhone] = useState('');

  const [supportPhoneDisplay, setSupportPhoneDisplay] = useState('');



  const pitchNameById = useMemo(() => {

    const m = new Map<string, string>();

    for (const p of pitches) m.set(p._id, p.name);

    return m;

  }, [pitches]);



  const availableToAdd = useMemo(

    () => pitches.filter((p) => !placements.some((pl) => pl.pitchId === p._id)),

    [pitches, placements],

  );



  useEffect(() => {

    void Promise.all([fetchAdminSiteSettings(), fetchAllPitches()])

      .then(([s, list]) => {

        setHomeVenuePreviewCount(s.homeVenuePreviewCount);

        setPlacements(s.homeFeaturedPlacements);

        setSupportEmail(s.supportEmail || 'support@sanschii.ir');

        setSupportPhone(s.supportPhone || '');

        setSupportPhoneDisplay(s.supportPhoneDisplay || '');

        setPitches(list.filter((p) => p.isActive));

      })

      .finally(() => setLoading(false));

  }, []);



  function movePlacement(index: number, dir: -1 | 1) {

    const next = index + dir;

    if (next < 0 || next >= placements.length) return;

    setPlacements((prev) => {

      const copy = [...prev];

      const tmp = copy[index];

      copy[index] = copy[next];

      copy[next] = tmp;

      return reorderPlacements(copy);

    });

  }



  function removePlacement(pitchId: string) {

    setPlacements((prev) => reorderPlacements(prev.filter((p) => p.pitchId !== pitchId)));

  }



  function addPlacement() {

    if (!newPitchId) {

      setMsg('زمین و تاریخ پایان قرارداد را انتخاب کنید.');

      return;

    }

    if (placements.length >= HOME_FEATURED_PLACEMENTS_MAX) {

      setMsg(`حداکثر ${numFa(HOME_FEATURED_PLACEMENTS_MAX)} جایگاه.`);

      return;

    }

    const end = new Date(newExpiry);

    end.setHours(23, 59, 59, 999);

    setPlacements((prev) =>

      reorderPlacements([

        ...prev,

        {

          pitchId: newPitchId,

          expiresAt: end.toISOString(),

          note: newNote.trim(),

          sortOrder: prev.length,

        },

      ]),

    );

    setNewPitchId('');

    setNewNote('');

    setNewExpiry(defaultPlacementExpiry());

    setMsg('');

  }



  async function submit() {

    setSaving(true);

    setMsg('');

    try {

      await saveAdminSiteSettings({

        homeVenuePreviewCount,

        homeFeaturedPlacements: placements,

        supportEmail,

        supportPhone,

        supportPhoneDisplay,

      });

      setMsg('ذخیره شد. صفحهٔ اصلی پس از رفرش ترتیب جدید را نشان می‌دهد.');

    } catch {

      setMsg('خطا در ذخیره؛ دوباره تلاش کنید.');

    } finally {

      setSaving(false);

      setTimeout(() => setMsg(''), 6000);

    }

  }



  function resetDefaults() {

    setHomeVenuePreviewCount(SITE_SETTINGS_DEFAULTS.homeVenuePreviewCount);

    setPlacements([]);

  }



  const now = Date.now();



  return (

    <>

      <PageIntro

        title="تنظیمات صفحهٔ اصلی"

        description="تعداد و چیدمان مجموعه‌ها در صفحهٔ اول — جایگاه قراردادی (مثلاً یک ماه) و اولویت لحظه‌آخر"

      />



      <ActionsPanel title="جایگاه ثابت صفحهٔ اصلی (قرارداد / تبلیغ)">

        <p className="muted-sm" style={{ marginBottom: '1rem' }}>

          مالک مجموعه می‌تواند برای نمایش ثابت در بخش «مجموعه‌های دیگر» قرارداد ببندد (مثلاً

          یک ماه). تا تاریخ پایان، آن زمین در اولویت نمایش است؛ بعد از انقضا خودکار از لیست

          خارج می‌شود. اگر جای خالی بماند، بقیه با برچسب «پیشنهادی» و سپس بقیهٔ مجموعه‌ها

          پر می‌شود.

        </p>



        {loading ? (

          <p className="muted-sm">در حال بارگذاری…</p>

        ) : placements.length === 0 ? (

          <p className="muted-sm">فعلاً جایگاه قراردادی ثبت نشده.</p>

        ) : (

          <ul className="home-placement-list">

            {placements.map((pl, index) => {

              const expired = new Date(pl.expiresAt).getTime() <= now;

              return (

                <li

                  key={pl.pitchId}

                  className={expired ? 'home-placement-row expired' : 'home-placement-row'}

                >

                  <div className="home-placement-main">

                    <strong>{pitchNameById.get(pl.pitchId) || pl.pitchId}</strong>

                    <span className="muted-sm">

                      تا {toJalaliString(pl.expiresAt)}

                      {expired ? ' · منقضی' : ''}

                    </span>

                    {pl.note ? <span className="muted-sm home-placement-note">{pl.note}</span> : null}

                  </div>

                  <div className="home-placement-actions">

                    <button

                      type="button"

                      className="btn btn-ghost btn-sm"

                      disabled={index === 0}

                      onClick={() => movePlacement(index, -1)}

                      aria-label="بالا"

                    >

                      ↑

                    </button>

                    <button

                      type="button"

                      className="btn btn-ghost btn-sm"

                      disabled={index === placements.length - 1}

                      onClick={() => movePlacement(index, 1)}

                      aria-label="پایین"

                    >

                      ↓

                    </button>

                    <button

                      type="button"

                      className="btn btn-ghost btn-sm"

                      onClick={() => removePlacement(pl.pitchId)}

                    >

                      حذف

                    </button>

                  </div>

                </li>

              );

            })}

          </ul>

        )}



        <div className="home-placement-add panel" style={{ marginTop: '1.25rem' }}>

          <p className="footer-nav-title" style={{ marginBottom: '0.75rem' }}>

            افزودن جایگاه

          </p>

          <div className="home-placement-add-grid">

            <div className="field">

              <label htmlFor="home-placement-pitch">مجموعه</label>

              <select

                id="home-placement-pitch"

                value={newPitchId}

                onChange={(e) => setNewPitchId(e.target.value)}

                disabled={loading || saving}

              >

                <option value="">انتخاب زمین…</option>

                {availableToAdd.map((p) => (

                  <option key={p._id} value={p._id}>

                    {p.name}

                  </option>

                ))}

              </select>

            </div>

            <div className="field">
              <label>پایان قرارداد (آخر همان روز)</label>
              <JalaliDatePicker value={newExpiry} onChange={setNewExpiry} />
            </div>

            <div className="field">

              <label htmlFor="home-placement-note">یادداشت (مبلغ / شماره قرارداد)</label>

              <input

                id="home-placement-note"

                value={newNote}

                onChange={(e) => setNewNote(e.target.value)}

                placeholder="مثلاً ۱٬۰۰۰٬۰۰۰ تومان — یک ماه"

                disabled={loading || saving}

              />

            </div>

          </div>

          <button

            type="button"

            className="btn btn-secondary btn-sm"

            style={{ marginTop: '0.75rem' }}

            disabled={loading || saving || !availableToAdd.length}

            onClick={addPlacement}

          >

            افزودن به لیست

          </button>

        </div>

      </ActionsPanel>



      <ActionsPanel title="تعداد نمایش در صفحهٔ اصلی">

        <p className="muted-sm" style={{ marginBottom: '1rem' }}>

          بین {numFa(HOME_VENUE_PREVIEW_MIN)} تا {numFa(HOME_VENUE_PREVIEW_MAX)} کارت در

          بخش «مجموعه‌های دیگر» — معمولاً {numFa(4)}. جایگاه‌های قراردادی فعال اول نمایش

          داده می‌شوند.

        </p>

        <div className="field" style={{ maxWidth: '16rem' }}>

          <StepperInput

            label="تعداد کارت"

            min={HOME_VENUE_PREVIEW_MIN}

            max={HOME_VENUE_PREVIEW_MAX}

            value={homeVenuePreviewCount}

            onChange={setHomeVenuePreviewCount}

          />

        </div>

      </ActionsPanel>



      <ActionsPanel title="تماس و پشتیبانی (فوتر سایت)">

        <div className="form-stack" style={{ maxWidth: '24rem' }}>

          <label>

            ایمیل پشتیبانی

            <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />

          </label>

          <label>

            تلفن (برای tel: — مثلاً +9821…)

            <input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />

          </label>

          <label>

            نمایش تلفن (مثلاً ۰۲۱-…)

            <input

              value={supportPhoneDisplay}

              onChange={(e) => setSupportPhoneDisplay(e.target.value)}

            />

          </label>

        </div>

      </ActionsPanel>



      <div className="form-actions" style={{ marginTop: '1.25rem' }}>

        <button

          type="button"

          className="btn btn-primary"

          disabled={loading || saving}

          onClick={() => void submit()}

        >

          {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}

        </button>

        <button

          type="button"

          className="btn btn-ghost"

          disabled={loading || saving}

          onClick={resetDefaults}

        >

          پیش‌فرض

        </button>

      </div>

      {msg ? (

        <p className={`form-msg ${msg.includes('خطا') ? 'err' : 'ok'}`} style={{ marginTop: '1rem' }}>

          {msg}

        </p>

      ) : null}

    </>

  );

}


