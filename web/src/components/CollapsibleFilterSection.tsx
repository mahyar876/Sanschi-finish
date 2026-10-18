'use client';

import { useCallback, useId, useState, type MouseEvent, type ReactNode } from 'react';
import { useCompactLayout } from '@/lib/use-compact-layout';

type Props = {
  title: string;
  /** وقتی بسته است — انتخاب فعلی */
  summary?: string;
  className?: string;
  titleClassName?: string;
  children: ReactNode;
  closeOnSelect?: boolean;
  /** در دسکتاپ از h2 استفاده شود (سایدبار گالری) */
  heading?: 'label' | 'h2';
};

export function CollapsibleFilterSection({
  title,
  summary,
  className = '',
  titleClassName,
  children,
  closeOnSelect = true,
  heading = 'label',
}: Props) {
  const compact = useCompactLayout();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const onPanelClick = useCallback(
    (e: MouseEvent) => {
      if (!compact || !closeOnSelect) return;
      const el = e.target as HTMLElement;
      if (el.closest('button, input, select, label, a[href]')) {
        requestAnimationFrame(() => setOpen(false));
      }
    },
    [compact, closeOnSelect],
  );

  if (!compact) {
    const TitleTag = heading === 'h2' ? 'h2' : 'span';
    const defaultTitleClass =
      heading === 'h2' ? 'gallery-sidebar-title' : 'gallery-filter-label';
    return (
      <section className={className}>
        <TitleTag className={titleClassName ?? defaultTitleClass}>{title}</TitleTag>
        {children}
      </section>
    );
  }

  const hint = summary?.trim() && !open ? summary : undefined;

  return (
    <section className={`collapsible-filter ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-filter-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="collapsible-filter-trigger-main">
          <span className="collapsible-filter-title">{title}</span>
          {hint ? <span className="collapsible-filter-summary">{hint}</span> : null}
        </span>
        <span
          className={open ? 'collapsible-filter-chevron is-open' : 'collapsible-filter-chevron'}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="collapsible-filter-panel" onClick={onPanelClick}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

type AsideProps = {
  title: string;
  summary?: string;
  className?: string;
  children: ReactNode;
};

/** فهرست کناری پیش‌نمایش موبایل / رسپانسیو */
export function CollapsibleAsideList({ title, summary, className = '', children }: AsideProps) {
  const compact = useCompactLayout();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const onPanelClick = useCallback(
    (e: MouseEvent) => {
      if (!compact) return;
      const el = e.target as HTMLElement;
      if (el.closest('button, a[href]')) {
        requestAnimationFrame(() => setOpen(false));
      }
    },
    [compact],
  );

  if (!compact) {
    return <aside className={className}>{children}</aside>;
  }

  const hint = summary?.trim() && !open ? summary : undefined;

  return (
    <aside className={`collapsible-aside ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-filter-trigger collapsible-aside-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="collapsible-filter-trigger-main">
          <span className="collapsible-filter-title">{title}</span>
          {hint ? <span className="collapsible-filter-summary">{hint}</span> : null}
        </span>
        <span
          className={open ? 'collapsible-filter-chevron is-open' : 'collapsible-filter-chevron'}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="collapsible-aside-panel" onClick={onPanelClick}>
          {children}
        </div>
      ) : null}
    </aside>
  );
}
