import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { fontSize: 'var(--text-body-sm)', padding: '8px 16px', radius: 'var(--radius-sm)', icon: 14 },
  md: { fontSize: 'var(--text-body-md)', padding: '13px 26px', radius: 'var(--radius-control)', icon: 18 },
  lg: { fontSize: 'var(--text-body-lg)', padding: '18px 36px', radius: 'var(--radius-md)', icon: 22 },
};

const VARIANTS = {
  primary: { background: 'var(--lima-500)', color: 'var(--text-on-accent)', border: '2px solid var(--lima-500)', hoverBg: 'var(--lima-600)', hoverBorder: 'var(--lima-600)' },
  secondary: { background: 'var(--terra-700)', color: 'var(--creme-500)', border: '2px solid var(--terra-700)', hoverBg: 'var(--terra-900)', hoverBorder: 'var(--terra-900)' },
  outline: { background: 'transparent', color: 'var(--text-body)', border: '2px solid var(--border-strong)', hoverBg: 'var(--terra-700)', hoverBorder: 'var(--terra-700)', hoverColor: 'var(--creme-500)' },
  ghost: { background: 'transparent', color: 'var(--text-body)', border: '2px solid transparent', hoverBg: 'var(--creme-700)', hoverBorder: 'transparent' },
  onDark: { background: 'var(--creme-500)', color: 'var(--terra-900)', border: '2px solid var(--creme-500)', hoverBg: 'var(--lima-500)', hoverBorder: 'var(--lima-500)' },
};

/** Rounded action button — the campaign's primary call to action. */
export function Button({
  variant = 'primary', size = 'md', icon, iconRotate, iconPosition = 'end',
  disabled = false, fullWidth = false, as = 'button', children, style, ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const Tag = as;
  return (
    <Tag
      {...rest}
      disabled={as === 'button' ? disabled : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        borderRadius: s.radius,
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--weight-bold)',
        fontSize: s.fontSize,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        textDecoration: 'none',
        padding: s.padding,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        background: hover && !disabled ? v.hoverBg : v.background,
        color: hover && !disabled && v.hoverColor ? v.hoverColor : v.color,
        border: hover && !disabled ? '2px solid ' + v.hoverBorder : v.border,
        transform: press && !disabled ? 'translateY(1px)' : 'none',
        transition: 'var(--transition-control)',
        ...style,
      }}
    >
      {icon && iconPosition === 'start' && <Icon name={icon} size={s.icon} rotate={iconRotate} />}
      {children}
      {icon && iconPosition === 'end' && <Icon name={icon} size={s.icon} rotate={iconRotate} />}
    </Tag>
  );
}
