import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Rounded native select styled with the brand pictogram arrow. */
export function Select({ label, hint, error, value, onChange, options = [], placeholder, disabled = false, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'nl-sel-' + React.useId();
  return (
    <label htmlFor={fid} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontFamily: 'var(--font-body)', ...style }}>
      {label && <span style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-label)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase' }}>{label}</span>}
      <span style={{ position: 'relative', display: 'block' }}>
        <select
          {...rest}
          id={fid} value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            borderRadius: 'var(--radius-control)',
            appearance: 'none', WebkitAppearance: 'none',
            width: '100%', font: 'inherit', fontSize: 'var(--text-body-md)',
            padding: '13px 46px 13px 16px',
            background: disabled ? 'var(--creme-600)' : 'var(--surface-field)',
            color: 'var(--text-body)',
            border: '2px solid ' + (error ? 'var(--status-danger)' : focus ? 'var(--lima-500)' : 'var(--border-hairline)'),
            outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'var(--transition-control)',
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lab = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{lab}</option>;
          })}
        </select>
        <Icon name="seta" size={14} rotate={90} color="var(--terra-700)" style={{ position: 'absolute', right: 16, top: '50%', marginTop: -7, pointerEvents: 'none' }} />
      </span>
      {(hint || error) && <span style={{ fontSize: 'var(--text-body-sm)', color: error ? 'var(--status-danger)' : 'var(--text-muted)' }}>{error || hint}</span>}
    </label>
  );
}
