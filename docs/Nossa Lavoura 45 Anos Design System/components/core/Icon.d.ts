import type { CSSProperties } from 'react';

export type IconName = 'boi' | 'saco' | 'grama' | 'seta';

/** Brand pictogram (solid silhouette) tinted with currentColor. */
export interface IconProps {
  name?: IconName;
  size?: number | string;
  color?: string;
  /** Degrees, handy for the seta arrow */
  rotate?: number;
  style?: CSSProperties;
  className?: string;
}
export function Icon(props: IconProps): JSX.Element;
