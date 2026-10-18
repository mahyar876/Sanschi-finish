'use client';

type Props = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function ToggleSwitch({ checked, onChange, label, description }: Props) {
  return (
    <div className="toggle-row">
      <span className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        {description ? <span className="toggle-row-desc">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle-switch-btn${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-slider" aria-hidden />
        <span className="visually-hidden">{label}</span>
      </button>
    </div>
  );
}
