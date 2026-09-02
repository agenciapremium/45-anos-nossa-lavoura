import React from 'react';

/** Radio group with round markers. */
export function Radio({ name, options = [], value, onChange, disabled = false, direction = 'column', style, ...rest }) {
  return (
    <div role="radiogroup" {...rest} style={{ display: 'flex', flexDirection: direction, gap: direction === 'row' ? 'var(--space-5)' : 'var(--space-3)', ...style }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        const on = value === val;
        return (
          <label key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-md)', color: 'var(--text-body)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
            <input type="radio" name={name} value={val} checked={on} disabled={disabled} onChange={() => onChange && onChange(val)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            <span aria-hidden="true" style={{
              borderRadius: 'var(--radius-pill)',
              width: 22, height: 22, flex: '0 0 auto',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: on ? 'var(--terra-700)' : 'var(--surface-field)',
              boxShadow: 'inset 0 0 0 2px ' + (on ? 'var(--terra-700)' : 'var(--border-hairline)'),
              transition: 'var(--transition-control)',
            }}>
              {on && <span style={{ width: 8, height: 8, background: 'var(--lima-500)', borderRadius: 'var(--radius-pill)' }} />}
            </span>
            {lab}
          </label>
        );
      })}
    </div>
  );
}
