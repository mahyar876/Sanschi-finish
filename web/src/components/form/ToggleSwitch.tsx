'use client';

type Props = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function ToggleSwitch({ id, checked, onChange, label, description }: Props) {
  const inputId = id || `toggle-${label.slice(0, 8)}`;
  return (
    <label className="toggle-row" htmlFor={inputId}>
      <span className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        {description ? <span className="toggle-row-desc">{description}</span> : null}
      </span>
      <span className="toggle-switch">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" aria-hidden />
      </span>
    </label>
  );
}
