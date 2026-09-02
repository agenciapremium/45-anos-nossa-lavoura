import type { CSSProperties, ReactNode } from 'react';

/** Small terra tooltip shown on hover and focus. */
export interface TooltipProps {
  label: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
  style?: CSSProperties;
}
export function Tooltip(props: TooltipProps): JSX.Element;
