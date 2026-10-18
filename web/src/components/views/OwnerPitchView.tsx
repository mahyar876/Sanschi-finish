'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { OwnerPitchEditor } from '@/components/views/owner/OwnerPitchEditor';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoOwnerPitches } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';

function OwnerPitchPageContent() {
  const search = useSearchParams();
  const [pitchId, setPitchId] = useState('');
  const [pitches, setPitches] = useState<{ _id: string; name: string }[]>([]);

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

  const pitchName = pitches.find((p) => p._id === pitchId)?.name;

  return (
    <>
      <PageIntro title={pitchName ? `ویرایش ${pitchName}` : 'ویرایش زمین'}>
        <Link href="/owner/pitches" className="btn btn-ghost btn-sm">
          لیست زمین‌ها
        </Link>
      </PageIntro>
      {pitches.length > 1 && (
        <ActionsPanel>
          <div className="field owner-tools-field">
            <label htmlFor="owner-pitch-select">مجموعه</label>
            <select
              id="owner-pitch-select"
              value={pitchId}
              onChange={(e) => setPitchId(e.target.value)}
            >
              {pitches.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </ActionsPanel>
      )}
      {pitchId ? <OwnerPitchEditor key={pitchId} pitchId={pitchId} /> : null}
    </>
  );
}

export function OwnerPitchView() {
  return (
    <Suspense fallback={<p className="subtitle">در حال بارگذاری…</p>}>
      <OwnerPitchPageContent />
    </Suspense>
  );
}
