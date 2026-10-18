import type { ReactNode } from 'react';

export function PageIntro({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="dash-page-intro">
      <div>
        <h1 className="dash-page-title">{title}</h1>
        {description && <p className="dash-page-desc">{description}</p>}
      </div>
      {children && <div className="dash-page-intro-actions">{children}</div>}
    </header>
  );
}

export function ActionsPanel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="dash-actions-panel panel">
      {(title || description) && (
        <div className="dash-actions-head">
          {title && <h2 className="dash-section-title">{title}</h2>}
          {description && <p className="dash-section-desc">{description}</p>}
        </div>
      )}
      <div className="dash-actions-body">{children}</div>
    </section>
  );
}

export function DataSection({
  title,
  toolbar,
  children,
}: {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-data-section">
      <div className="dash-data-head">
        <h2 className="dash-section-title">{title}</h2>
        {toolbar}
      </div>
      <div className="dash-data-body">{children}</div>
    </section>
  );
}

export function ListToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  className,
}: {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  filters?: ReactNode;
  className?: string;
}) {
  return (
    <div className={['dash-list-toolbar', className].filter(Boolean).join(' ')}>
      {onSearchChange && (
        <input
          type="search"
          className="dash-search-input"
          placeholder={searchPlaceholder || 'جستجو…'}
          value={searchValue || ''}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      )}
      {filters}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="stat-row">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
