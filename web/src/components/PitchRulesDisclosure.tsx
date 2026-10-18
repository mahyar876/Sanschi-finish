'use client';

import { useId, useState } from 'react';

function splitRules(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

type Props = {
  title?: string;
  text?: string;
  lines?: string[];
  className?: string;
};

export function PitchRulesDisclosure({
  title = 'قوانین این مجموعه',
  text,
  lines: linesProp,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const lines = linesProp ?? (text?.trim() ? splitRules(text) : []);
  if (lines.length === 0) return null;

  const summary =
    lines.length > 1
      ? `${lines.length} بند — برای مطالعه باز کنید`
      : lines[0].length > 56
        ? `${lines[0].slice(0, 56)}…`
        : lines[0];

  return (
    <section className={`pitch-rules-disclosure ${className}`.trim()}>
      <button
        type="button"
        className="pitch-rules-disclosure-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pitch-rules-disclosure-main">
          <span className="pitch-rules-disclosure-title">{title}</span>
          {!open ? (
            <span className="pitch-rules-disclosure-summary muted-sm">{summary}</span>
          ) : null}
        </span>
        <span
          className={
            open ? 'pitch-rules-disclosure-chevron is-open' : 'pitch-rules-disclosure-chevron'
          }
          aria-hidden
        />
      </button>
      {open ? (
        <ul id={panelId} className="pitch-rules-disclosure-list notice">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
