import React from 'react';

/** Rounded checkbox with a terra tick. */
export function Checkbox({ label, checked = false, onChange, disabled = false, id, style, ...rest }) {
  const fid = id || 'nl-cb-' + React.useId();
  return (
    <label htmlFor={fid} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-md)', color: 'var(--text-body)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <input {...rest} id={fid} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        borderRadius: 'var(--radius-xs)',
        width: 22, height: 22, flex: '0 0 auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? 'var(--lima-500)' : 'var(--surface-field)',
        boxShadow: 'inset 0 0 0 2px ' + (checked ? 'var(--lima-500)' : 'var(--border-hairline)'),
        transition: 'var(--transition-control)',
      }}>
        {checked && (
          <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden="true"><path d="M1 5.2 4.6 8.8 12 1.4" fill="none" stroke="var(--terra-900)" strokeWidth="2.4" strokeLinecap="square" /></svg>
        )}
      </span>
      {label}
    </label>
  );
}
