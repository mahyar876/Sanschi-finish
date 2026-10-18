'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import {
  APPLICATION_STATUS_LABEL,
  approveOwnerApplication,
  fetchOwnerApplications,
  rejectOwnerApplication,
  requestOwnerApplicationRevision,
  type OwnerApplication,
} from '@/lib/owner-applications';
import { TEHRAN_ZONE_LABEL, type TehranZone } from '@/lib/tehran-zones';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { womenBookingLabel } from '@/lib/women-booking';
import { numFa, toJalaliString } from '@/lib/jalali';

const VENUE_TYPE_LABEL = { futsal: 'سالن / فوتسال', grass: 'زمین چمن' } as const;

function formatWhen(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${toJalaliString(d)} · ${numFa(time)}`;
}

function pitchSummary(pitch: OwnerApplication['pitch']): { id: string; label: string } | null {
  if (!pitch) return null;
  if (typeof pitch === 'string') return { id: pitch, label: pitch };
  const id = pitch._id;
  const name = pitch.name || 'زمین متصل';
  const active =
    pitch.isActive === undefined ? '' : pitch.isActive ? ' · فعال' : ' · غیرفعال';
  return { id, label: `${name}${active}` };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="partner-detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ApplicationDetail({
  app,
  busy,
  onClose,
  onApprove,
  onReject,
  onRevision,
}: {
  app: OwnerApplication;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevision: (note: string) => void;
}) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionErr, setRevisionErr] = useState('');

  useEffect(() => {
    setRevisionOpen(false);
    setRevisionNote('');
    setRevisionErr('');
  }, [app._id]);

  const zone =
    app.tehranZone && app.tehranZone in TEHRAN_ZONE_LABEL
      ? TEHRAN_ZONE_LABEL[app.tehranZone as TehranZone]
      : null;
  const linked = pitchSummary(app.pitch);

  return (
    <ActionsPanel
      title={app.venueName}
      description={APPLICATION_STATUS_LABEL[app.status]}
    >
      <div className="partner-detail-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          بستن جزئیات
        </button>
      </div>
      <dl className="partner-detail-grid">
        <DetailRow label="وضعیت">{APPLICATION_STATUS_LABEL[app.status]}</DetailRow>
        <DetailRow label="تاریخ ثبت">{formatWhen(app.createdAt)}</DetailRow>
        <DetailRow label="تاریخ بررسی">{formatWhen(app.reviewedAt)}</DetailRow>

        <DetailRow label="نام">{app.firstName || app.contactName.split(/\s+/)[0]}</DetailRow>
        <DetailRow label="نام خانوادگی">
          {app.lastName || app.contactName.split(/\s+/).slice(1).join(' ') || '—'}
        </DetailRow>
        <DetailRow label="موبایل">
          <a href={`tel:${app.phone}`}>{numFa(app.phone)}</a>
        </DetailRow>
        <DetailRow label="ایمیل">
          {app.email ? (
            <a href={`mailto:${app.email}`}>{app.email}</a>
          ) : (
            <span className="muted-sm">ثبت نشده</span>
          )}
        </DetailRow>
        <DetailRow label="شماره شبا">
          {app.sheba ? (
            <span dir="ltr" className="input-ltr">
              {app.sheba}
            </span>
          ) : (
            <span className="muted-sm">ثبت نشده</span>
          )}
        </DetailRow>

        <DetailRow label="نوع مجموعه">{VENUE_TYPE_LABEL[app.venueType]}</DetailRow>
        <DetailRow label="ابعاد (متر)">{pitchSizeLabel(app.size)}</DetailRow>
        <DetailRow label="محدوده تهران">{zone || '—'}</DetailRow>
        <DetailRow label="آدرس">
          <span className="partner-detail-multiline">{app.address}</span>
        </DetailRow>
        <DetailRow label="قیمت پایه هر سانس">{priceFa(app.basePrice)} تومان</DetailRow>
        <DetailRow label="رزرو بانوان">
          {womenBookingLabel(app.womenBookingAllowed)}
        </DetailRow>
        <DetailRow label="توضیحات و امکانات">
          {app.description?.trim() ? (
            <span className="partner-detail-multiline">{app.description}</span>
          ) : (
            <span className="muted-sm">—</span>
          )}
        </DetailRow>

        {app.adminNote?.trim() ? (
          <DetailRow label="یادداشت مدیر">{app.adminNote}</DetailRow>
        ) : null}
        {app.rejectReason?.trim() ? (
          <DetailRow label="دلیل رد">{app.rejectReason}</DetailRow>
        ) : null}
        {app.revisionNote?.trim() ? (
          <DetailRow label="نیازمند اصلاح">
            <span className="partner-detail-multiline">{app.revisionNote}</span>
          </DetailRow>
        ) : null}
        {linked ? (
          <DetailRow label="زمین در سیستم">
            <Link href="/admin/pitches" className="link-inline">
              {linked.label}
            </Link>
          </DetailRow>
        ) : null}
      </dl>

      {app.status === 'pending' && (
        <>
          {revisionOpen ? (
            <div className="partner-revision-form panel" style={{ marginTop: '1rem' }}>
              <label htmlFor="revision-note" className="dash-section-desc">
                چه چیزهایی باید اصلاح شود؟ (متقاضی با همین شماره فرم را دوباره پر می‌کند)
              </label>
              <textarea
                id="revision-note"
                rows={4}
                className="partner-revision-textarea"
                value={revisionNote}
                onChange={(e) => {
                  setRevisionNote(e.target.value);
                  setRevisionErr('');
                }}
                placeholder="مثلاً: آدرس دقیق‌تر، عکس سالن، قیمت سانس غیرواقعی…"
              />
              {revisionErr && <p className="form-error">{revisionErr}</p>}
              <div className="pitch-admin-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => {
                    const note = revisionNote.trim();
                    if (note.length < 10) {
                      setRevisionErr('حداقل ۱۰ کاراکتر توضیح بنویسید.');
                      return;
                    }
                    onRevision(note);
                    setRevisionOpen(false);
                    setRevisionNote('');
                  }}
                >
                  ارسال برای اصلاح
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setRevisionOpen(false);
                    setRevisionNote('');
                    setRevisionErr('');
                  }}
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <div className="pitch-admin-actions" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={onApprove}
              >
                تأیید و ساخت زمین
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => setRevisionOpen(true)}
              >
                نیاز به اصلاح
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onReject}>
                رد درخواست
              </button>
            </div>
          )}
        </>
      )}
    </ActionsPanel>
  );
}

export function AdminPartnerRequestsPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rows, setRows] = useState<OwnerApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetchOwnerApplications(tab).then((list) => {
      setRows(list);
      setSelectedId((prev) => (prev && list.some((a) => a._id === prev) ? prev : null));
    });
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedId(null);
  }, [tab]);

  const selected = useMemo(
    () => rows.find((a) => a._id === selectedId) ?? null,
    [rows, selectedId],
  );

  function toggleRow(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  async function approve(id: string) {
    setBusyId(id);
    setMsg('');
    try {
      const { message } = await approveOwnerApplication(id);
      setMsg(message);
      setSelectedId(null);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusyId(null);
    }
  }

  async function revision(id: string, revisionNote: string) {
    setBusyId(id);
    setMsg('');
    try {
      const { message } = await requestOwnerApplicationRevision(id, revisionNote);
      setMsg(message);
      setSelectedId(null);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('دلیل رد (اختیاری):') || '';
    setBusyId(id);
    setMsg('');
    try {
      const { message } = await rejectOwnerApplication(id, reason);
      setMsg(message);
      setSelectedId(null);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageIntro
        title="درخواست‌های همکاری"
        description="روی هر درخواست کلیک کنید تا جزئیات کامل باز شود؛ دوباره کلیک یا «بستن» پنل را می‌بندد."
      />
      <div className="chips" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={tab === 'pending' ? 'chip active' : 'chip'}
          onClick={() => setTab('pending')}
        >
          در انتظار
        </button>
        <button
          type="button"
          className={tab === 'all' ? 'chip active' : 'chip'}
          onClick={() => setTab('all')}
        >
          همه
        </button>
      </div>
      {msg && <p className="notice">{msg}</p>}

      <DataSection title={`${numFa(rows.length)} درخواست`}>
        {rows.length === 0 ? (
          <p className="muted-sm">درخواستی برای نمایش نیست.</p>
        ) : (
          <>
            {!selected && (
              <p className="muted-sm partner-list-hint">
                برای دیدن اطلاعات تماس، آدرس و توضیحات روی یک ردیف کلیک کنید.
              </p>
            )}
            <div className="data-table-wrap">
              <table className="data-table responsive-stack">
                <thead>
                  <tr>
                    <th>مجموعه</th>
                    <th>تماس</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr
                      key={a._id}
                      className={a._id === selectedId ? 'partner-row-selected' : undefined}
                      onClick={() => toggleRow(a._id)}
                      style={{ cursor: 'pointer' }}
                      aria-expanded={a._id === selectedId}
                    >
                      <td data-label="مجموعه">
                        <strong>{a.venueName}</strong>
                        <br />
                        <span className="muted-sm">
                          {VENUE_TYPE_LABEL[a.venueType]} · {pitchSizeLabel(a.size)}
                        </span>
                      </td>
                      <td data-label="تماس">
                        {a.contactName}
                        <br />
                        <span className="muted-sm">{numFa(a.phone)}</span>
                      </td>
                      <td data-label="قیمت">
                        <span className="muted-sm">از {priceFa(a.basePrice)}</span>
                      </td>
                      <td data-label="وضعیت">{APPLICATION_STATUS_LABEL[a.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataSection>

      {selected && (
        <div className="partner-requests-detail-reveal" aria-live="polite">
          <ApplicationDetail
            app={selected}
            busy={busyId === selected._id}
            onClose={() => setSelectedId(null)}
            onApprove={() => void approve(selected._id)}
            onReject={() => void reject(selected._id)}
            onRevision={(note) => void revision(selected._id, note)}
          />
        </div>
      )}
    </>
  );
}
