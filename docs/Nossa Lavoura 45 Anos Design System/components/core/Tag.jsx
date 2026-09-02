import React from 'react';

/** Selectable / removable rounded chip. */
export function Tag({ selected = false, onRemove, onClick, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <span
      {...rest}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--radius-pill)',
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: '7px 14px',
        background: selected ? 'var(--terra-700)' : hover ? 'var(--creme-700)' : 'var(--creme-600)',
        color: selected ? 'var(--creme-500)' : 'var(--text-body)',
        fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-bold)',
        fontSize: 'var(--text-body-sm)', lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition-control)',
        ...style,
      }}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remover"
          style={{ all: 'unset', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, lineHeight: 1, opacity: 0.7 }}
        >×</button>
      )}
    </span>
  );
}
