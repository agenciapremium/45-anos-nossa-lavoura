import React from 'react';
import { Panel } from './Panel.jsx';
import { Badge } from './Badge.jsx';
import { Icon } from './Icon.jsx';

/** Product / content card on the rounded Panel surface. */
export function Card({ title, eyebrow, description, badge, icon, image, imageAlt = '', tone = 'card', radius = 'var(--radius-card)', footer, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const inverse = tone === 'terra';
  return (
    <Panel
      {...rest}
      tone={tone}
      radius={radius}
      padding="0"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transform: hover && onClick ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {image && (
        <div style={{ height: 168, background: 'var(--creme-700)', overflow: 'hidden' }}>
          <img src={image} alt={imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1 }}>
        {(badge || icon) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            {badge ? <Badge tone={inverse ? 'accent' : 'creme'}>{badge}</Badge> : <span />}
            {icon && <Icon name={icon} size={28} color={inverse ? 'var(--lima-500)' : 'var(--terra-700)'} />}
          </div>
        )}
        {eyebrow && <span className="nl-eyebrow" style={{ color: inverse ? 'var(--lima-500)' : 'var(--text-accent)' }}>{eyebrow}</span>}
        {title && <h3 style={{ color: inverse ? 'var(--creme-500)' : 'var(--text-strong)', fontSize: 'var(--text-h3)' }}>{title}</h3>}
        {description && <p style={{ color: inverse ? 'var(--text-on-inverse-muted)' : 'var(--text-body)', fontSize: 'var(--text-body-md)' }}>{description}</p>}
        {footer && <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)' }}>{footer}</div>}
      </div>
    </Panel>
  );
}
