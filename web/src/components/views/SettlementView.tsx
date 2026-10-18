'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ActionsPanel,
  DataSection,
  ListToolbar,
  PageIntro,
  StatCard,
  StatGrid,
} from '@/components/dashboard/DashboardPageBlocks';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoSettlements } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';
import { getUser } from '@/lib/session';
import { priceFa } from '@/lib/format';
import {
  settlementStatusClass,
  settlementStatusLabel,
} from '@/lib/settlement-ui';

type Settlement = {
  _id: string;
  date: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  paidCount?: number;
  voidedCount?: number;
  pitch?: { name: string; type?: string };
  owner?: { name: string; phone: string };
  reservations?: {
    _id: string;
    code?: string;
    amount?: number;
    slotTime?: string;
    status?: string;
  }[];
};

type Stats = {
  totalGross?: number;
  totalCommission?: number;
  totalNet?: number;
  pending?: number;
  approved?: number;
  paid?: number;
};

export function SettlementView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Settlement[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [genDate, setGenDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (isDemoFrontend()) {
      setRows(getDemoSettlements());
      return;
    }
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterDate.trim()) params.set('date', filterDate.trim());
    const qs = params.toString();
    const path = isAdmin
      ? `/settlements${qs ? `?${qs}` : ''}`
      : `/settlements/my${qs ? `?${qs}` : ''}`;
    void apiFetch<{ success: boolean; settlements: Settlement[]; stats?: Stats }>(path)
      .then((d) => {
        if (d.success) {
          setRows(d.settlements);
          if (d.stats) setStats(d.stats);
        }
      })
      .catch(() => setRows(getDemoSettlements()));
  }, [filterDate, filterStatus, isAdmin]);

  useEffect(() => {
    setIsAdmin(getUser()?.role === 'admin');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requestSettlement() {
    setMsg('');
    setErr('');
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>(
        '/settlements/request',
        { method: 'POST', body: JSON.stringify({ fromDate: from, toDate: to }) },
      );
      if (!data.success) throw new Error(data.message);
      setMsg(data.message || 'درخواست ثبت شد');
      load();
    } catch (e) {
      if (isDemoFrontend()) {
        setMsg('درخواست تسویه (نمایشی) ثبت شد');
        setRows(getDemoSettlements());
        return;
      }
      setErr(e instanceof Error ? e.message : 'خطا');
    }
  }

  async function generateDaily() {
    setMsg('');
    setErr('');
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>(
        '/settlements/generate',
        { method: 'POST', body: JSON.stringify({ date: genDate.trim() }) },
      );
      if (!data.success) throw new Error(data.message);
      setMsg(data.message || 'تسویه تولید شد');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا');
    }
  }

  async function patchSettlement(id: string, action: 'approve' | 'pay' | 'reject') {
    setBusyId(id);
    setErr('');
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>(
        `/settlements/${id}/${action}`,
        { method: 'PATCH', body: '{}' },
      );
      if (!data.success) throw new Error(data.message);
      setMsg('به‌روزرسانی شد');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <PageIntro
        title="تسویه مالی"
        description={
          isAdmin
            ? 'مدیریت تسویه چند مالک — تولید روزانه، تأیید و پرداخت به صاحبان زمین'
            : 'درآمد خالص پس از کارمزد سانس‌چی — درخواست بازه و پیگیری وضعیت'
        }
      />

      {(stats.pending != null || stats.totalNet != null) && (
        <StatGrid>
          <StatCard label="در انتظار" value={stats.pending ?? 0} />
          <StatCard label="تأیید‌شده" value={stats.approved ?? 0} />
          <StatCard label="پرداخت‌شده" value={stats.paid ?? 0} />
          <StatCard label="جمع خالص" value={priceFa(stats.totalNet ?? 0)} />
        </StatGrid>
      )}

      {isAdmin && (
        <ActionsPanel title="عملیات مدیر" description="تولید تسویه روزانه برای همه مالک‌ها">
          <div className="dash-form-row">
            <div className="field">
              <label>تاریخ شمسی (مثلاً 1404/07/20)</label>
              <input value={genDate} onChange={(e) => setGenDate(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!genDate.trim()}
              onClick={() => void generateDaily()}
            >
              تولید تسویه این روز
            </button>
          </div>
        </ActionsPanel>
      )}

      {!isAdmin && (
        <section className="panel owner-tools-panel">
          <h2 className="dash-section-title">درخواست تسویه بازه‌ای</h2>
          <div className="owner-settle-request">
            <div className="field">
              <label htmlFor="settle-from">از تاریخ</label>
              <input
                id="settle-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="1404/01/01"
              />
            </div>
            <div className="field">
              <label htmlFor="settle-to">تا تاریخ</label>
              <input
                id="settle-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="1404/01/31"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void requestSettlement()}
            >
              ثبت درخواست
            </button>
          </div>
        </section>
      )}

      {msg && <p className="form-msg ok">{msg}</p>}
      {err && <p className="form-msg err">{err}</p>}

      <DataSection
        title="لیست تسویه"
        toolbar={
          <ListToolbar
            className={isAdmin ? undefined : 'owner-filter-bar'}
            filters={
              <>
                <select
                  className="dash-filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="وضعیت تسویه"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار</option>
                  <option value="approved">تأیید‌شده</option>
                  <option value="paid">پرداخت‌شده</option>
                  <option value="rejected">رد‌شده</option>
                </select>
                {!isAdmin && (
                  <input
                    className="dash-filter-input"
                    placeholder="تاریخ (1404/07/20)"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    aria-label="فیلتر تاریخ"
                  />
                )}
                {isAdmin && (
                  <input
                    className="dash-filter-input"
                    placeholder="فیلتر تاریخ"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                  به‌روزرسانی
                </button>
              </>
            }
          />
        }
      >
        <div
          className={
            isAdmin ? 'data-table-wrap' : 'data-table-wrap owner-card-table-wrap'
          }
        >
          <table className={isAdmin ? 'data-table' : 'data-table owner-card-table'}>
            <thead>
              <tr>
                <th>تاریخ</th>
                {isAdmin && <th>مالک</th>}
                <th>مجموعه</th>
                <th>ناخالص</th>
                <th>کارمزد</th>
                <th>خالص</th>
                <th>وضعیت</th>
                <th>{isAdmin ? 'عملیات' : 'جزئیات'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className={isAdmin ? undefined : 'owner-card-empty muted-sm'}
                    style={isAdmin ? { color: 'var(--text-muted)' } : undefined}
                  >
                    تسویه‌ای ثبت نشده
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <Fragment key={s._id}>
                  <tr>
                    <td data-label="تاریخ">{s.date}</td>
                    {isAdmin && (
                      <td>
                        {s.owner ? (
                          <>
                            {s.owner.name}
                            <br />
                            <span className="muted-sm">{s.owner.phone}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td data-label="مجموعه">{s.pitch?.name || '—'}</td>
                    <td data-label="ناخالص">{priceFa(s.grossAmount)}</td>
                    <td data-label="کارمزد">{priceFa(s.commissionAmount)}</td>
                    <td data-label="خالص">
                      <strong>{priceFa(s.netAmount)}</strong>
                    </td>
                    <td data-label="وضعیت">
                      <span className={settlementStatusClass(s.status)}>
                        {settlementStatusLabel(s.status)}
                      </span>
                    </td>
                    <td data-label="" className="table-actions">
                      {isAdmin ? (
                        <div className="dash-inline-actions">
                          {s.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busyId === s._id}
                                onClick={() => void patchSettlement(s._id, 'approve')}
                              >
                                تأیید
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={busyId === s._id}
                                onClick={() => void patchSettlement(s._id, 'pay')}
                              >
                                پرداخت شد
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={busyId === s._id}
                                onClick={() => void patchSettlement(s._id, 'reject')}
                              >
                                رد
                              </button>
                            </>
                          )}
                          {s.status === 'approved' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busyId === s._id}
                              onClick={() => void patchSettlement(s._id, 'pay')}
                            >
                              علامت پرداخت
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setExpandedId(expandedId === s._id ? null : s._id)
                          }
                        >
                          {expandedId === s._id ? 'بستن' : 'رزروها'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {!isAdmin && expandedId === s._id && s.reservations?.length ? (
                    <tr key={`${s._id}-detail`}>
                      <td colSpan={7}>
                        <ul className="settle-res-list">
                          {s.reservations.map((r) => (
                            <li key={r._id}>
                              {r.code || r._id} · {r.slotTime} · {priceFa(r.amount || 0)}{' '}
                              تومان · {r.status}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </DataSection>
    </>
  );
}
