'use client';

import { useEffect, useState } from 'react';
import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import { exportPitchesJson, fetchAllPitches } from '@/lib/pitch-service';

export function AdminExportPage() {
  const [json, setJson] = useState('');

  useEffect(() => {
    void fetchAllPitches().then((p) => setJson(exportPitchesJson(p)));
  }, []);

  function copy() {
    void navigator.clipboard.writeText(json);
  }

  return (
    <>
      <PageIntro title="خروجی داده" description="کپی JSON مجموعه‌ها برای پشتیبان یا مهاجرت." />
      <ActionsPanel>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          کپی
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void fetchAllPitches().then((p) => setJson(exportPitchesJson(p)))}
        >
          بروزرسانی
        </button>
        <textarea className="export-json" readOnly rows={18} value={json} />
      </ActionsPanel>
    </>
  );
}
