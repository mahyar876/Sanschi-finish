'use client';

import type { ReactNode } from 'react';
import { ClientPortal } from '@/components/ui/ClientPortal';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function OwnerQuickSheet({ open, title, subtitle, onClose, children }: Props) {
  if (!open) return null;

  return (
    <ClientPortal>
      <button
        type="button"
        className="owner-sheet-backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="owner-quick-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-sheet-title"
      >
        <div className="owner-quick-sheet-handle" aria-hidden />
        <h2 id="owner-sheet-title" className="owner-quick-sheet-title">
          {title}
        </h2>
        {subtitle && <p className="owner-quick-sheet-sub muted-sm">{subtitle}</p>}
        <div className="owner-quick-sheet-actions">{children}</div>
        <button type="button" className="btn btn-ghost owner-quick-sheet-dismiss" onClick={onClose}>
          انصراف
        </button>
      </div>
    </ClientPortal>
  );
}
