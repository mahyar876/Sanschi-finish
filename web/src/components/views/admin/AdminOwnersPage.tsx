'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataSection, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import type { Pitch } from '@/lib/pitch-types';
import { assignPitchOwner, fetchAllPitches } from '@/lib/pitch-service';

export function AdminOwnersPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [ownerIds, setOwnerIds] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    void fetchAllPitches().then((list) => {
      setPitches(list);
      const map: Record<string, string> = {};
      list.forEach((p) => {
        map[p._id] = p.owner?._id || p.owner?.phone || '';
      });
      setOwnerIds(map);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(pitchId: string) {
    const val = ownerIds[pitchId]?.trim();
    await assignPitchOwner(pitchId, val || null);
    setMsg('✓ مالک به‌روز شد');
    load();
  }

  return (
    <>
      <PageIntro
        title="مالکیت زمین‌ها"
        description="شناسه کاربر مالک (یا در دمو: شماره موبایل) را به هر مجموعه وصل کنید."
      />
      {msg && <p className="notice">{msg}</p>}
      <DataSection title="اتصال مالک">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>مجموعه</th>
                <th>مالک فعلی</th>
                <th>شناسه / موبایل مالک</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pitches.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.owner?.name || p.owner?.phone || '—'}</td>
                  <td>
                    <input
                      className="tbl-inp"
                      value={ownerIds[p._id] || ''}
                      onChange={(e) =>
                        setOwnerIds((prev) => ({ ...prev, [p._id]: e.target.value }))
                      }
                      placeholder="userId یا 0912…"
                    />
                  </td>
                  <td>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => void save(p._id)}>
                      ذخیره
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setOwnerIds((prev) => ({ ...prev, [p._id]: '' }));
                        void assignPitchOwner(p._id, null).then(load);
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
