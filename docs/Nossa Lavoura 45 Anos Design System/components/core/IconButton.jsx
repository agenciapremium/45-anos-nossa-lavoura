import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = { sm: 34, md: 44, lg: 56 };

/** Square rounded button holding a single pictogram. */
export function IconButton({ icon = 'seta', iconRotate, variant = 'primary', size = 'md', label, disabled = false, style, ...rest }) {
  const box = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const palette = {
    primary: ['var(--lima-500)', 'var(--terra-900)', 'var(--lima-600)'],
    secondary: ['var(--terra-700)', 'var(--creme-500)', 'var(--terra-900)'],
    outline: ['transparent', 'var(--text-body)', 'var(--creme-700)'],
  }[variant] || ['var(--lima-500)', 'var(--terra-900)', 'var(--lima-600)'];
  return (
    <button
      {...rest}
      aria-label={label || icon}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: size === 'sm' ? 'var(--radius-sm)' : 'var(--radius-control)',
        width: box, height: box,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: hover && !disabled ? palette[2] : palette[0],
        color: palette[1],
        border: variant === 'outline' ? '2px solid var(--border-strong)' : '2px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        transition: 'var(--transition-control)',
        ...style,
      }}
    >
      <Icon name={icon} rotate={iconRotate} size={Math.round(box * 0.46)} />
    </button>
  );
}
