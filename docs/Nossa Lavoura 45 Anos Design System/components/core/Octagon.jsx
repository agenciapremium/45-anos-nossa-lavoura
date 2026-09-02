import React from 'react';

/* Corner fragment of the brand octagon: exactly two faces are ever visible —
   one straight edge and one 45° edge, matching the supplied
   assets/shapes/octogono-*.svg geometry (soft 2% corner radius).
   Coordinates are in a 0–100 box anchored at the bottom-left corner;
   the remaining edges sit flush against the container edges. */
const SOLID = 'M0,100 L0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100 Z';
const LINE = 'M0,42 Q0,39 3,39 L39,39 Q42,39 44.1,41.1 L98,95 Q100,97 100,100';

const ROTATION = { 'bottom-left': 0, 'top-left': 90, 'top-right': 180, 'bottom-right': 270 };
const ANCHOR = {
  'bottom-left': { left: 0, bottom: 0 },
  'top-left': { left: 0, top: 0 },
  'top-right': { right: 0, top: 0 },
  'bottom-right': { right: 0, bottom: 0 },
};

/**
 * Decorative background element: a corner of the brand octagon, solid or
 * outline. Anchors itself to a corner of the nearest positioned ancestor
 * (which must have overflow:hidden) so only two faces ever show.
 */
export function Octagon({ corner = 'bottom-left', size = 320, variant = 'solid', color = 'var(--lima-500)', strokeWidth = 2, opacity = 1, style, ...rest }) {
  return (
    <svg
      aria-hidden="true" focusable="false"
      viewBox="0 0 100 100" width={size} height={size}
      {...rest}
      style={{
        position: 'absolute',
        ...ANCHOR[corner],
        display: 'block',
        pointerEvents: 'none',
        opacity,
        transform: 'rotate(' + (ROTATION[corner] || 0) + 'deg)',
        ...style,
      }}
    >
      {variant === 'solid'
        ? <path d={SOLID} fill={color} />
        : <path d={LINE} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
