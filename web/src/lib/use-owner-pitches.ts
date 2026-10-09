'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch-api';
import { getDemoOwnerPitches } from '@/lib/demo-dashboard';
import { isDemoFrontend } from '@/lib/demo';

export type OwnerPitchOption = { _id: string; name: string; commissionAmount?: number };

export function useOwnerPitches() {
  const [pitches, setPitches] = useState<OwnerPitchOption[]>([]);
  const [pitchId, setPitchId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoFrontend()) {
      const list = getDemoOwnerPitches().map((p) => ({
        ...p,
        commissionAmount: 45_000,
      }));
      setPitches(list);
      setPitchId(list[0]?._id || '');
      setLoading(false);
      return;
    }
    void apiFetch<{ success: boolean; pitches: OwnerPitchOption[] }>('/owner/pitches')
      .then((d) => {
        if (d.success && d.pitches.length) {
          setPitches(d.pitches);
          setPitchId(d.pitches[0]._id);
        }
      })
      .catch(() => {
        const list = getDemoOwnerPitches();
        setPitches(list);
        setPitchId(list[0]?._id || '');
      })
      .finally(() => setLoading(false));
  }, []);

  return { pitches, pitchId, setPitchId, loading };
}
