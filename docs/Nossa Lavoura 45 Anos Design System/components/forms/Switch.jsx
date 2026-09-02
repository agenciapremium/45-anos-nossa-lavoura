import React from 'react';

/** Pill-track toggle. */
export function Switch({ label, checked = false, onChange, disabled = false, id, style, ...rest }) {
  const fid = id || 'nl-sw-' + React.useId();
  return (
    <label htmlFor={fid} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-md)', color: 'var(--text-body)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <input {...rest} id={fid} type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        borderRadius: 'var(--radius-pill)',
        width: 52, height: 28, padding: 3, flex: '0 0 auto',
        display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        background: checked ? 'var(--lima-500)' : 'var(--creme-700)',
        transition: 'background-color var(--dur-fast) var(--ease-standard)',
      }}>
        <span style={{ width: 22, height: 22, background: 'var(--terra-700)', borderRadius: 'var(--radius-pill)', transition: 'all var(--dur-fast) var(--ease-standard)' }} />
      </span>
      {label}
    </label>
  );
}
