import React from 'react';

/** Hover/focus tooltip on a rounded terra slab. */
export function Tooltip({ label, placement = 'top', children, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: { bottom: '100%', left: '50%', transform: 'translate(-50%,-8px)' },
    bottom: { top: '100%', left: '50%', transform: 'translate(-50%,8px)' },
    left: { right: '100%', top: '50%', transform: 'translate(-8px,-50%)' },
    right: { left: '100%', top: '50%', transform: 'translate(8px,-50%)' },
  }[placement];
  return (
    <span
      {...rest}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
    >
      {children}
      <span role="tooltip" style={{
        borderRadius: 'var(--radius-xs)',
        position: 'absolute', ...pos,
        background: 'var(--terra-900)', color: 'var(--creme-500)',
        padding: '8px 12px', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)',
        opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
        transition: 'opacity var(--dur-fast) var(--ease-standard)',
        pointerEvents: 'none', zIndex: 40,
      }}>{label}</span>
    </span>
  );
}
