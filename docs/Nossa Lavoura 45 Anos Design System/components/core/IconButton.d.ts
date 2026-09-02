import type { CSSProperties } from 'react';
import type { IconName } from './Icon';

/** Square chamfered button carrying one brand pictogram. */
export interface IconButtonProps {
  icon?: IconName;
  iconRotate?: number;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label — required in practice */
  label?: string;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export function IconButton(props: IconButtonProps): JSX.Element;
