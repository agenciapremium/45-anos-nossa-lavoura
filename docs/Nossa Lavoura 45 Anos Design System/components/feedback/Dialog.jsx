import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

/** Centred rounded modal over a terra scrim. */
export function Dialog({ open = false, title, description, children, footer, onClose, width = 520, style, ...rest }) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--surface-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)' }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
        {...rest}
        style={{
          borderRadius: 'var(--radius-surface)',
          width: '100%', maxWidth: width,
          background: 'var(--surface-card)',
          padding: 'var(--space-6)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          animation: 'none',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {title && <h3 style={{ fontSize: 'var(--text-h3)' }}>{title}</h3>}
            {description && <p style={{ color: 'var(--text-muted)' }}>{description}</p>}
          </div>
          {onClose && <IconButton icon="seta" iconRotate={180} variant="outline" size="sm" label="Fechar" onClick={onClose} />}
        </div>
        {children}
        {footer && <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}
