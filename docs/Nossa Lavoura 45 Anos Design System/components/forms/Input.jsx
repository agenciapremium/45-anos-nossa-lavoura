import React from 'react';

/** Rounded text field with label, hint and error states. */
export function Input({ label, hint, error, value, onChange, placeholder, type = 'text', disabled = false, required = false, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'nl-in-' + React.useId();
  return (
    <label htmlFor={fid} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontFamily: 'var(--font-body)', ...style }}>
      {label && (
        <span style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-body)' }}>
          {label}{required && <span style={{ color: 'var(--status-danger)' }}> *</span>}
        </span>
      )}
      <input
        {...rest}
        id={fid} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} required={required}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          borderRadius: 'var(--radius-control)',
          font: 'inherit', fontSize: 'var(--text-body-md)',
          padding: '13px 16px',
          background: disabled ? 'var(--creme-600)' : 'var(--surface-field)',
          color: 'var(--text-body)',
          border: '2px solid ' + (error ? 'var(--status-danger)' : focus ? 'var(--lima-500)' : 'var(--border-hairline)'),
          outline: 'none',
          transition: 'var(--transition-control)',
        }}
      />
      {(hint || error) && (
        <span style={{ fontSize: 'var(--text-body-sm)', color: error ? 'var(--status-danger)' : 'var(--text-muted)' }}>{error || hint}</span>
      )}
    </label>
  );
}
