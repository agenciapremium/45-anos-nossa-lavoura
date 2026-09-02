import type { CSSProperties } from 'react';

/**
 * Decorative background element — a corner fragment of the brand octagon,
 * showing exactly two faces (one straight edge + one 45° edge).
 * Solid fill or outline with a transparent centre; purely ornamental.
 */
export interface OctagonProps {
  /** Which corner of the parent it anchors to */
  corner?: 'bottom-left' | 'top-left' | 'top-right' | 'bottom-right';
  /** Rendered box size in px */
  size?: number | string;
  variant?: 'solid' | 'outline';
  color?: string;
  /** Outline thickness in px — constant at every size */
  strokeWidth?: number;
  opacity?: number;
  style?: CSSProperties;
}
export function Octagon(props: OctagonProps): JSX.Element;
