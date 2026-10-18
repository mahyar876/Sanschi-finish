'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { numFa } from '@/lib/jalali';
import { priceFa } from '@/lib/format';

type DiscountRow = {
  _id: string;
  code: string;
  percent: number;
  maxUses: number;
  usedCount: number;
  maxDiscountAmount?: number | null;
  expiresAt?: string | null;
  active: boolean;
  createdAt?: string;
};

export function AdminDiscountsPage() {
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState(10);
  const [maxUses, setMaxUses] = useState(100);
  const [maxCap, setMaxCap] = useState('');
  const [expiresDays, setExpiresDays] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void apiFetch<{ success: boolean; discounts: DiscountRow[] }>('/discounts').then(
      (d) => {
        if (d.success) setRows(d.discounts);
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      let expiresAt: string | undefined;
      if (expiresDays.trim()) {
        const days = parseInt(expiresDays, 10);
        if (days > 0) {
          expiresAt = new Date(Date.now() + days * 86400000).toISOString();
        }
      }
      await apiFetch('/discounts', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim(),
          percent,
          maxUses,
          maxDiscountAmount: maxCap.trim() ? parseInt(maxCap, 10) : undefined,
          expiresAt,
          active: true,
        }),
      });
      setMsg(`✓ کد «${code.trim().toUpperCase()}» ثبت شد`);
      setCode('');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await apiFetch(`/discounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  return (
    <>
      <PageIntro
        title="کدهای تخفیف"
        description="برای استوری، کمپین، پنالتی یا هر مناسبت — کاربر در صفحه پرداخت کد را وارد می‌کند."
      />
      {msg && <p className="notice">{msg}</p>}
      <ActionsPanel title="ساخت کد جدید">
        <form className="form-stack" onSubmit={createCode}>
          <div className="field-row">
            <div className="field">
              <label>کد (لاتین)</label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="STORY20"
              />
            </div>
            <div className="field">
              <label>درصد تخفیف</label>
              <input
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(parseInt(e.target.value, 10) || 10)}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>حداکثر استفاده</label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="field">
              <label>سقف مبلغ تخفیف (تومان، اختیاری)</label>
              <input
                type="number"
                min={0}
                value={maxCap}
                onChange={(e) => setMaxCap(e.target.value)}
                placeholder="مثلاً ۵۰۰۰۰۰"
              />
            </div>
          </div>
          <div className="field">
            <label>اعتبار (روز، اختیاری)</label>
            <input
              type="number"
              min={1}
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              placeholder="خالی = بدون انقضا"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? '…' : 'ثبت کد'}
          </button>
        </form>
      </ActionsPanel>
      <DataSection title={`کدهای فعال و گذشته (${rows.length})`}>
        <div className="data-table-wrap">
          <table className="data-table responsive-stack">
            <thead>
              <tr>
                <th>کد</th>
                <th>٪</th>
                <th>استفاده</th>
                <th>سقف</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td data-label="کد">
                    <strong>{r.code}</strong>
                  </td>
                  <td data-label="٪">{numFa(r.percent)}٪</td>
                  <td data-label="استفاده">
                    {numFa(r.usedCount)} / {numFa(r.maxUses)}
                  </td>
                  <td data-label="سقف">
                    {r.maxDiscountAmount ? priceFa(r.maxDiscountAmount) : '—'}
                  </td>
                  <td data-label="وضعیت">{r.active ? 'فعال' : 'غیرفعال'}</td>
                  <td className="table-actions" data-label="">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void toggleActive(r._id, r.active)}
                    >
                      {r.active ? 'غیرفعال' : 'فعال'}
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="muted-sm">
                    هنوز کدی ثبت نشده — WELCOME10 را با seed-discount.js هم می‌توانید بسازید.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
