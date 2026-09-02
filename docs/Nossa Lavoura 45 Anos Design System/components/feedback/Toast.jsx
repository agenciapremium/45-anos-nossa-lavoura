import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  neutral: ['var(--terra-700)', 'var(--creme-500)', 'var(--lima-500)'],
  success: ['var(--status-success)', 'var(--branco)', 'var(--branco)'],
  danger: ['var(--status-danger)', 'var(--branco)', 'var(--branco)'],
};

/** Inline confirmation strip with a lime slab marker. */
export function Toast({ tone = 'neutral', title, message, icon = 'grama', onClose, style, ...rest }) {
  const [bg, fg, accent] = TONES[tone] || TONES.neutral;
  return (
    <div role="status" {...rest} style={{
      borderRadius: 'var(--radius-card)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
      background: bg, color: fg,
      padding: '16px 20px', minWidth: 320,
      fontFamily: 'var(--font-body)',
      ...style,
    }}>
      <Icon name={icon} size={26} color={accent} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {title && <strong style={{ fontSize: 'var(--text-body-md)', fontWeight: 'var(--weight-bold)' }}>{title}</strong>}
        {message && <span style={{ fontSize: 'var(--text-body-sm)', opacity: 0.85 }}>{message}</span>}
      </div>
      {onClose && <button onClick={onClose} aria-label="Fechar" style={{ all: 'unset', cursor: 'pointer', fontWeight: 700, opacity: 0.7, padding: '0 4px' }}>×</button>}
    </div>
  );
}
