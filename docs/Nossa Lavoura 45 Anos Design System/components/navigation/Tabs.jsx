import React from 'react';

/** Tab strip with rounded top corners on a slab rule. */
export function Tabs({ items = [], value, onChange, tone = 'light', style, ...rest }) {
  const inverse = tone === 'dark';
  return (
    <div role="tablist" {...rest} style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '2px solid ' + (inverse ? 'var(--border-on-inverse)' : 'var(--border-hairline)'), ...style }}>
      {items.map((it) => {
        const val = typeof it === 'string' ? it : it.value;
        const lab = typeof it === 'string' ? it : it.label;
        const on = value === val;
        return (
          <button
            key={val} role="tab" aria-selected={on}
            onClick={() => onChange && onChange(val)}
            style={{
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              border: 'none', cursor: 'pointer',
              padding: '13px 22px',
              marginBottom: -2,
              fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-bold)',
              fontSize: 'var(--text-body-sm)', letterSpacing: '0.08em', textTransform: 'uppercase',
              background: on ? (inverse ? 'var(--lima-500)' : 'var(--terra-700)') : 'transparent',
              color: on ? (inverse ? 'var(--terra-900)' : 'var(--creme-500)') : (inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-muted)'),
              transition: 'var(--transition-control)',
            }}
          >{lab}</button>
        );
      })}
    </div>
  );
}
