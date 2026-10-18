'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataSection, ListToolbar, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { getDemoOwnerCustomers } from '@/lib/demo-dashboard';
import { priceFa } from '@/lib/format';
import { useOwnerPitches } from '@/lib/use-owner-pitches';
import { isDemoFrontend } from '@/lib/demo';
import { ApiError } from '@/lib/fetch-api';
import {
  fetchOwnerCustomers,
  patchOwnerCustomerTag,
  type OwnerCustomerRow,
} from '@/lib/owner-api';

const TAG_FA = { vip: 'VIP', blocked: 'مسدود', none: 'عادی' };

export function OwnerCustomersView() {
  const { pitches, pitchId, setPitchId } = useOwnerPitches();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<OwnerCustomerRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    if (!pitchId) return;
    if (isDemoFrontend()) {
      setRows(
        getDemoOwnerCustomers().map((r) => ({
          ...r,
          userId: null,
          lastDate: '—',
          tag: 'none' as const,
          note: '',
        })),
      );
      return;
    }
    void fetchOwnerCustomers(pitchId)
      .then((d) => {
        if (d.success) setRows(d.customers);
      })
      .catch(() => {
        setRows(
          getDemoOwnerCustomers().map((r) => ({
            ...r,
            userId: null,
            lastDate: '—',
            tag: 'none' as const,
            note: '',
          })),
        );
      });
  }, [pitchId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter((r) => {
      if (!q) return true;
      return `${r.name} ${r.phone}`.includes(q);
    });
  }, [rows, search]);

  async function setTag(phone: string, tag: 'vip' | 'blocked' | 'none') {
    if (!pitchId || isDemoFrontend()) {
      setMsg('در حالت نمایشی ذخیره نمی‌شود');
      return;
    }
    let note = '';
    if (tag === 'blocked') {
      const reason = prompt('دلیل مسدودسازی (اختیاری):');
      if (reason === null) return;
      note = reason.trim();
    }
    try {
      await patchOwnerCustomerTag(pitchId, phone, { tag, note });
      setMsg(tag === 'none' ? 'برچسب حذف شد' : `برچسب ${TAG_FA[tag]} ثبت شد`);
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'خطا');
    }
  }

  return (
    <>
      <PageIntro
        title="مشتریان"
        description="بازیکنانی که از مجموعه شما رزرو کرده‌اند — VIP یا مسدود برای رزرو آنلاین."
      />
      {msg && <p className="notice">{msg}</p>}
      {pitches.length > 1 && (
        <div className="field owner-tools-field">
          <label htmlFor="owner-cust-pitch">مجموعه</label>
          <select
            id="owner-cust-pitch"
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
      )}
      <DataSection
        title="مشتریان"
        toolbar={
          <ListToolbar
            className="owner-filter-bar"
            searchPlaceholder="جستجو نام یا موبایل…"
            searchValue={search}
            onSearchChange={setSearch}
          />
        }
      >
        <div className="data-table-wrap owner-card-table-wrap">
          <table className="data-table owner-card-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>موبایل</th>
                <th>رزرو</th>
                <th>سهم شما</th>
                <th>آخرین</th>
                <th>برچسب</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="owner-card-empty muted-sm">
                    مشتری یافت نشد.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.phone}>
                  <td data-label="نام">{r.name}</td>
                  <td data-label="موبایل" dir="ltr">
                    {r.phone}
                  </td>
                  <td data-label="رزرو">{r.count}</td>
                  <td data-label="سهم شما">{priceFa(r.total)}</td>
                  <td data-label="آخرین">{r.lastDate}</td>
                  <td data-label="برچسب">
                    <span
                      className={`badge ${r.tag === 'vip' ? 'badge-success' : r.tag === 'blocked' ? 'badge-danger' : ''}`}
                    >
                      {TAG_FA[r.tag]}
                    </span>
                    {r.note && <span className="muted-sm owner-card-sub">{r.note}</span>}
                  </td>
                  <td className="table-actions" data-label="">
                    {r.tag !== 'vip' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void setTag(r.phone, 'vip')}
                      >
                        VIP
                      </button>
                    )}
                    {r.tag !== 'blocked' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void setTag(r.phone, 'blocked')}
                      >
                        مسدود
                      </button>
                    )}
                    {r.tag !== 'none' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void setTag(r.phone, 'none')}
                      >
                        حذف برچسب
                      </button>
                    )}
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
