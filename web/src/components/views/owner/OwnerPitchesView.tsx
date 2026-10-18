'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type KeyboardEvent } from 'react';
import { PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { OwnerQuickSheet } from '@/components/owner/OwnerQuickSheet';
import { OwnerPitchEditor } from '@/components/views/owner/OwnerPitchEditor';
import { ClientPortal } from '@/components/ui/ClientPortal';
import type { OwnerPitchOption } from '@/lib/use-owner-pitches';
import { useOwnerPitches } from '@/lib/use-owner-pitches';

function OwnerPitchesContent() {
  const { pitches, loading } = useOwnerPitches();
  const router = useRouter();
  const search = useSearchParams();
  const [sheetPitch, setSheetPitch] = useState<OwnerPitchOption | null>(null);
  const [editPitchId, setEditPitchId] = useState<string | null>(null);

  const editPitch = editPitchId
    ? pitches.find((p) => p._id === editPitchId) ?? null
    : null;

  useEffect(() => {
    const edit = search.get('edit');
    if (edit && pitches.some((p) => p._id === edit)) {
      setEditPitchId(edit);
    }
  }, [search, pitches]);

  useEffect(() => {
    const open = Boolean(editPitchId || sheetPitch);
    document.body.classList.toggle('owner-overlay-open', open);
    return () => {
      document.body.classList.remove('owner-overlay-open');
    };
  }, [editPitchId, sheetPitch]);

  function openEdit(pitch: OwnerPitchOption) {
    setSheetPitch(null);
    setEditPitchId(pitch._id);
    router.replace(`/owner/pitches?edit=${pitch._id}`, { scroll: false });
  }

  function closeEdit() {
    setEditPitchId(null);
    router.replace('/owner/pitches', { scroll: false });
  }

  function openSheet(pitch: OwnerPitchOption) {
    setSheetPitch(pitch);
  }

  function onRowKeyDown(e: KeyboardEvent, pitch: OwnerPitchOption) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSheet(pitch);
    }
  }

  return (
    <>
      <PageIntro
        title="زمین‌های من"
        description={
          loading
            ? '…'
            : pitches.length
              ? `${pitches.length} مجموعه — برای مدیریت لمس کنید`
              : 'هنوز مجموعه‌ای به حساب شما وصل نشده'
        }
      />

      <div className="owner-pitch-list" aria-busy={loading}>
        {pitches.map((p) => (
          <div
            key={p._id}
            className="owner-pitch-row"
            role="button"
            tabIndex={0}
            onClick={() => openSheet(p)}
            onKeyDown={(e) => onRowKeyDown(e, p)}
          >
            <span className="owner-pitch-row-name">{p.name}</span>
            <span
              className={`badge owner-pitch-row-badge ${p.isActive !== false ? 'paid' : 'cancelled'}`}
            >
              {p.isActive !== false ? 'فعال' : 'غیرفعال'}
            </span>
            <span className="owner-pitch-row-chevron" aria-hidden>
              ◂
            </span>
          </div>
        ))}
      </div>

      {!loading && pitches.length === 0 && (
        <p className="notice">با پشتیبانی تماس بگیرید تا مجموعه به حساب شما وصل شود.</p>
      )}

      <OwnerQuickSheet
        open={Boolean(sheetPitch)}
        title={sheetPitch?.name ?? ''}
        subtitle={sheetPitch?.address}
        onClose={() => setSheetPitch(null)}
      >
        <button
          type="button"
          className="btn btn-primary owner-quick-action"
          onClick={() => sheetPitch && openEdit(sheetPitch)}
        >
          ویرایش اطلاعات، عکس و نقشه
        </button>
        {sheetPitch && (
          <Link
            href={`/owner/slots?pitch=${sheetPitch._id}`}
            className="btn btn-secondary owner-quick-action"
            onClick={() => setSheetPitch(null)}
          >
            مدیریت سانس‌ها
          </Link>
        )}
        {sheetPitch && (
          <Link
            href={`/owner/reservations?pitch=${sheetPitch._id}`}
            className="btn btn-ghost owner-quick-action"
            onClick={() => setSheetPitch(null)}
          >
            رزروهای این مجموعه
          </Link>
        )}
      </OwnerQuickSheet>

      {editPitchId && (
        <ClientPortal>
          <div className="owner-form-drawer" role="dialog" aria-modal="true">
            <header className="owner-form-drawer-head">
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeEdit}>
                ← بازگشت
              </button>
              <h2 className="owner-form-drawer-title">{editPitch?.name ?? 'ویرایش'}</h2>
            </header>
            <div className="owner-form-drawer-body">
              <OwnerPitchEditor pitchId={editPitchId} />
            </div>
          </div>
        </ClientPortal>
      )}
    </>
  );
}

export function OwnerPitchesView() {
  return (
    <Suspense fallback={<p className="muted-sm">در حال بارگذاری…</p>}>
      <OwnerPitchesContent />
    </Suspense>
  );
}
