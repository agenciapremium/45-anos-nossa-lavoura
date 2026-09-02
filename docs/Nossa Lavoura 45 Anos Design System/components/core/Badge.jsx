import React from 'react';

const TONES = {
  accent: ['var(--lima-500)', 'var(--terra-900)'],
  terra: ['var(--terra-700)', 'var(--creme-500)'],
  creme: ['var(--creme-700)', 'var(--terra-700)'],
  success: ['var(--status-success-soft)', 'var(--status-success)'],
  warning: ['var(--status-warning-soft)', 'var(--status-warning)'],
  danger: ['var(--status-danger-soft)', 'var(--status-danger)'],
};

/** Small rounded status/label chip. */
export function Badge({ tone = 'accent', children, style, ...rest }) {
  const [bg, fg] = TONES[tone] || TONES.accent;
  return (
    <span
      {...rest}
      style={{
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex', alignItems: 'center',
        padding: '5px 12px',
        background: bg, color: fg,
        fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-bold)',
        fontSize: 'var(--text-label)', letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase', lineHeight: 1,
        ...style,
      }}
    >{children}</span>
  );
}
