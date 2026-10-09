'use client';

import { useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoFinanceStats, getDemoOwnerPitches } from '@/lib/demo-dashboard';
import { getDemoReservations } from '@/lib/demo-reservations';
import { isDemoFrontend } from '@/lib/demo';
import { priceFa } from '@/lib/format';

type Res = {
  _id: string;
  amount: number;
  status: string;
  siteCommission?: number | null;
  pitchAmount?: number | null;
};

export function FinanceView() {
  const [pitchId, setPitchId] = useState('');
  const [pitches, setPitches] = useState<{ _id: string; name: string; commissionAmount?: number }[]>([]);
  const [rows, setRows] = useState<Res[]>([]);

  useEffect(() => {
    if (isDemoFrontend()) {
      const list = getDemoOwnerPitches().map((p) => ({
        ...p,
        commissionAmount: 45_000,
      }));
      setPitches(list);
      setPitchId(list[0]?._id || '');
      return;
    }
    void apiFetch<{ success: boolean; pitches: typeof pitches }>('/owner/pitches')
      .then((d) => {
        if (d.success && d.pitches.length) {
          setPitches(d.pitches);
          setPitchId(d.pitches[0]._id);
        }
      })
      .catch(() => {
        const list = getDemoOwnerPitches().map((p) => ({
          ...p,
          commissionAmount: 45_000,
        }));
        setPitches(list);
        setPitchId(list[0]?._id || '');
      });
  }, []);

  useEffect(() => {
    if (!pitchId) return;
    if (isDemoFrontend()) {
      setRows(
        getDemoReservations()
          .filter((r) => r.status === 'paid')
          .map((r) => ({
            _id: r._id,
            amount: r.amount,
            status: 'paid',
            siteCommission: 45_000,
            pitchAmount: Math.max(0, r.amount - 45_000),
          })),
      );
      return;
    }
    void apiFetch<{ success: boolean; reservations: Res[] }>(
      `/owner/pitches/${pitchId}/reservations`,
    )
      .then((d) => {
        if (d.success) setRows(d.reservations.filter((r) => r.status === 'paid'));
      })
      .catch(() => {
        const stats = getDemoFinanceStats();
        if (stats.paidCount === 0) setRows([]);
        else
          setRows(
            getDemoReservations()
              .filter((r) => r.status === 'paid')
              .map((r) => ({
                _id: r._id,
                amount: r.amount,
                status: 'paid',
                siteCommission: 45_000,
                pitchAmount: Math.max(0, r.amount - 45_000),
              })),
          );
      });
  }, [pitchId]);

  const pitch = pitches.find((p) => p._id === pitchId);
  const commissionDefault = pitch?.commissionAmount ?? 0;

  let gross = 0;
  let commission = 0;
  let net = 0;
  for (const r of rows) {
    gross += r.amount || 0;
    const c = r.siteCommission ?? commissionDefault;
    const n = r.pitchAmount ?? Math.max(0, (r.amount || 0) - c);
    commission += c;
    net += n;
  }

  return (
    <>
      <PageIntro
        title="درآمد و گزارش مالی"
        description="درآمد ناخالص، کمیسیون سانس‌چی، مبلغ قابل تسویه و جزئیات تراکنش‌ها."
      />
      {pitches.length > 0 && (
        <ActionsPanel>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>مجموعه</label>
            <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
              {pitches.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </ActionsPanel>
      )}

      <StatGrid>
        <StatCard label="ناخالص" value={priceFa(gross)} />
        <StatCard label="کارمزد سانس‌چی" value={priceFa(commission)} />
        <StatCard label="سهم شما (خالص)" value={priceFa(net)} />
      </StatGrid>

      <DataSection title="جزئیات">
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>مبلغ کل</th>
              <th>کارمزد</th>
              <th>سهم مالک</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = r.siteCommission ?? commissionDefault;
              const n = r.pitchAmount ?? Math.max(0, (r.amount || 0) - c);
              return (
                <tr key={r._id}>
                  <td>{priceFa(r.amount)}</td>
                  <td>{priceFa(c)}</td>
                  <td>{priceFa(n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </DataSection>
    </>
  );
}
