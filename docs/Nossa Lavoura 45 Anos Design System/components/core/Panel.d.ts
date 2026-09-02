import type { CSSProperties, ReactNode } from 'react';

/** Rounded surface primitive used for every block-level container. */
export interface PanelProps {
  tone?: 'page' | 'card' | 'creme' | 'terra' | 'accent';
  /** Corner radius, e.g. "var(--radius-surface)" */
  radius?: string;
  padding?: string;
  /** 2px terra outline instead of a fill-only surface */
  bordered?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}
export function Panel(props: PanelProps): JSX.Element;
