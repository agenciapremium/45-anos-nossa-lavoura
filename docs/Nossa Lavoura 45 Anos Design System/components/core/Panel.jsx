import React from 'react';

const TONES = {
  page: ['var(--surface-page)', 'var(--text-body)'],
  card: ['var(--surface-card)', 'var(--text-body)'],
  creme: ['var(--creme-600)', 'var(--text-body)'],
  terra: ['var(--surface-inverse)', 'var(--text-on-inverse)'],
  accent: ['var(--surface-accent)', 'var(--text-on-accent)'],
};

/** Rounded surface primitive — every block in the system sits on one. */
export function Panel({ tone = 'card', radius = 'var(--radius-card)', padding = 'var(--space-6)', bordered = false, children, style, ...rest }) {
  const [bg, fg] = TONES[tone] || TONES.card;
  return (
    <div
      {...rest}
      style={{
        borderRadius: radius,
        background: bg,
        color: fg,
        padding,
        border: bordered ? '2px solid var(--border-strong)' : undefined,
        ...style,
      }}
    >{children}</div>
  );
}
