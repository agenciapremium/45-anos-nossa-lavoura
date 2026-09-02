import type { CSSProperties, ReactNode } from 'react';

/** Small chamfered label chip for statuses and campaign flags. */
export interface BadgeProps {
  tone?: 'accent' | 'terra' | 'creme' | 'success' | 'warning' | 'danger';
  children?: ReactNode;
  style?: CSSProperties;
}
export function Badge(props: BadgeProps): JSX.Element;
