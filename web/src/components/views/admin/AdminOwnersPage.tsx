'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionsPanel, DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import {
  assignPitchOwnerDetailed,
  fetchAdminOwners,
  removePitchOwnerApi,
  updateAdminOwner,
  type AdminOwnerRecord,
  type AdminOwnerPitch,
} from '@/lib/admin-owners';
import { formatShebaDisplay, isValidSheba, normalizeSheba } from '@/lib/sheba';
import { numFa } from '@/lib/jalali';

type AssignDraft = {
  phone: string;
  firstName: string;
  lastName: string;
  sheba: string;
  email: string;
  createIfMissing: boolean;
};

const emptyAssign = (): AssignDraft => ({
  phone: '',
  firstName: '',
  lastName: '',
  sheba: '',
  email: '',
  createIfMissing: true,
});

export function AdminOwnersPage() {
  const [owners, setOwners] = useState<AdminOwnerRecord[]>([]);
  const [unassigned, setUnassigned] = useState<AdminOwnerPitch[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<AdminOwnerRecord>>>({});
  const [assignByPitch, setAssignByPitch] = useState<Record<string, AssignDraft>>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetchAdminOwners()
      .then((data) => {
        setOwners(data.owners);
        setUnassigned(data.unassignedPitches);
        setEdits({});
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function ownerEdit(id: string): Partial<AdminOwnerRecord> {
    return edits[id] || {};
  }

  function patchEdit(id: string, patch: Partial<AdminOwnerRecord>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function displayOwner(o: AdminOwnerRecord) {
    const e = ownerEdit(o._id);
    return {
      firstName: e.firstName ?? o.firstName,
      lastName: e.lastName ?? o.lastName,
      phone: e.phone ?? o.phone,
      email: e.email ?? o.email,
      sheba: e.sheba ?? o.sheba,
    };
  }

  async function saveOwner(o: AdminOwnerRecord) {
    const d = displayOwner(o);
    if (d.sheba && !isValidSheba(d.sheba)) {
      setMsg('شماره شبا معتبر نیست (IR + ۲۴ رقم)');
      return;
    }
    setSavingId(o._id);
    setMsg('');
    try {
      await updateAdminOwner(o._id, {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        email: d.email,
        sheba: d.sheba ? normalizeSheba(d.sheba) : '',
      });
      setMsg('✓ اطلاعات مالک ذخیره شد');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setSavingId(null);
    }
  }

  function assignDraft(pitchId: string): AssignDraft {
    return assignByPitch[pitchId] || emptyAssign();
  }

  function patchAssign(pitchId: string, patch: Partial<AssignDraft>) {
    setAssignByPitch((prev) => ({
      ...prev,
      [pitchId]: { ...assignDraft(pitchId), ...patch },
    }));
  }

  async function assignPitch(pitchId: string) {
    const d = assignDraft(pitchId);
    if (!/^09[0-9]{9}$/.test(d.phone)) {
      setMsg('موبایل مالک معتبر نیست');
      return;
    }
    if (d.createIfMissing) {
      if (d.firstName.trim().length < 2 || d.lastName.trim().length < 2) {
        setMsg('نام و نام خانوادگی برای ساخت حساب الزامی است');
        return;
      }
      if (!isValidSheba(d.sheba)) {
        setMsg('شماره شبا معتبر نیست');
        return;
      }
    }
    setSavingId(pitchId);
    setMsg('');
    try {
      await assignPitchOwnerDetailed(pitchId, d);
      setMsg('✓ مالک به مجموعه وصل شد');
      setAssignByPitch((prev) => {
        const next = { ...prev };
        delete next[pitchId];
        return next;
      });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'اتصال ناموفق بود');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <PageIntro
        title="مالکیت زمین‌ها"
        description="اطلاعات صاحب زمین (نام، موبایل، شبا) و اتصال هر مجموعه به حساب مالک"
      />
      {msg && <p className="notice">{msg}</p>}

      <DataSection title="مالک‌های ثبت‌شده">
        {loading ? (
          <p className="muted-sm">در حال بارگذاری…</p>
        ) : owners.length === 0 ? (
          <p className="muted-sm">هنوز مالکی به مجموعه وصل نشده — از بخش پایین یا درخواست همکاری.</p>
        ) : (
          <div className="owner-profile-list">
            {owners.map((o) => {
              const d = displayOwner(o);
              return (
                <article key={o._id} className="panel owner-profile-card">
                  <div className="owner-profile-head">
                    <h3 className="owner-profile-title">{o.name}</h3>
                    <p className="muted-sm">
                      {numFa(o.pitches.length)} مجموعه — نقش {o.role === 'admin' ? 'مدیر' : 'صاحب زمین'}
                    </p>
                  </div>
                  <div className="owner-profile-fields">
                    <div className="field">
                      <label>نام</label>
                      <input
                        value={d.firstName}
                        onChange={(e) => patchEdit(o._id, { firstName: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>نام خانوادگی</label>
                      <input
                        value={d.lastName}
                        onChange={(e) => patchEdit(o._id, { lastName: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>موبایل</label>
                      <input
                        inputMode="tel"
                        value={d.phone}
                        onChange={(e) => patchEdit(o._id, { phone: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>ایمیل</label>
                      <input
                        type="email"
                        value={d.email}
                        onChange={(e) => patchEdit(o._id, { email: e.target.value })}
                      />
                    </div>
                    <div className="field owner-profile-sheba">
                      <label>شماره شبا</label>
                      <input
                        value={d.sheba}
                        onChange={(e) => patchEdit(o._id, { sheba: e.target.value })}
                        placeholder="IR120170000000000000000000"
                        dir="ltr"
                        className="input-ltr"
                      />
                      {d.sheba && isValidSheba(d.sheba) ? (
                        <p className="muted-sm">{formatShebaDisplay(d.sheba)}</p>
                      ) : null}
                    </div>
                  </div>
                  <ul className="owner-profile-pitches muted-sm">
                    {o.pitches.map((p) => (
                      <li key={p._id}>
                        {p.name}
                        {!p.isActive ? ' (غیرفعال)' : ''}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingId === o._id}
                    onClick={() => void saveOwner(o)}
                  >
                    {savingId === o._id ? 'ذخیره…' : 'ذخیره اطلاعات مالک'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </DataSection>

      <ActionsPanel title="اتصال مجموعه بدون مالک">
        <p className="muted-sm" style={{ marginBottom: '1rem' }}>
          اگر مالک هنوز در سایت ثبت‌نام نکرده، با «ساخت حساب» همان‌جا حساب صاحب زمین با شبا
          ساخته می‌شود.
        </p>
        {unassigned.length === 0 ? (
          <p className="muted-sm">همه مجموعه‌ها مالک دارند.</p>
        ) : (
          <div className="owner-assign-list">
            {unassigned.map((p) => {
              const d = assignDraft(p._id);
              return (
                <div key={p._id} className="panel owner-assign-card">
                  <h3 className="owner-assign-title">{p.name}</h3>
                  <div className="owner-profile-fields">
                    <div className="field">
                      <label>موبایل مالک</label>
                      <input
                        inputMode="tel"
                        value={d.phone}
                        onChange={(e) => patchAssign(p._id, { phone: e.target.value })}
                        placeholder="09121234567"
                      />
                    </div>
                    <div className="field">
                      <label>نام</label>
                      <input
                        value={d.firstName}
                        onChange={(e) => patchAssign(p._id, { firstName: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>نام خانوادگی</label>
                      <input
                        value={d.lastName}
                        onChange={(e) => patchAssign(p._id, { lastName: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>شماره شبا</label>
                      <input
                        value={d.sheba}
                        onChange={(e) => patchAssign(p._id, { sheba: e.target.value })}
                        placeholder="IR…"
                        dir="ltr"
                        className="input-ltr"
                      />
                    </div>
                    <div className="field">
                      <label>ایمیل (اختیاری)</label>
                      <input
                        type="email"
                        value={d.email}
                        onChange={(e) => patchAssign(p._id, { email: e.target.value })}
                      />
                    </div>
                  </div>
                  <label className="owner-assign-check">
                    <input
                      type="checkbox"
                      checked={d.createIfMissing}
                      onChange={(e) =>
                        patchAssign(p._id, { createIfMissing: e.target.checked })
                      }
                    />
                    اگر حساب نبود، بساز (نام + شبا لازم است)
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingId === p._id}
                    onClick={() => void assignPitch(p._id)}
                  >
                    {savingId === p._id ? 'در حال اتصال…' : 'اتصال مالک'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ActionsPanel>

      <DataSection title="قطع مالکیت">
        <p className="muted-sm" style={{ marginBottom: '0.75rem' }}>
          فقط اتصال مجموعه به مالک حذف می‌شود؛ حساب کاربر باقی می‌ماند.
        </p>
        <div className="data-table-wrap">
          <table className="data-table responsive-stack">
            <thead>
              <tr>
                <th>مجموعه</th>
                <th>مالک فعلی</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {owners.flatMap((o) =>
                o.pitches.map((p) => (
                  <tr key={p._id}>
                    <td data-label="مجموعه">{p.name}</td>
                    <td data-label="مالک">
                      {o.name} — {numFa(o.phone)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          void removePitchOwnerApi(p._id).then(() => {
                            setMsg('✓ مالک از مجموعه جدا شد');
                            load();
                          })
                        }
                      >
                        حذف اتصال
                      </button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
