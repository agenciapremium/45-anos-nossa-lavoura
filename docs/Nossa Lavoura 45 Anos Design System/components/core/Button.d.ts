import type { CSSProperties, ReactNode } from 'react';
import type { IconName } from './Icon';

/**
 * Chamfered action button in the 45-anos campaign language.
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'onDark';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRotate?: number;
  iconPosition?: 'start' | 'end';
  disabled?: boolean;
  fullWidth?: boolean;
  /** 'button' (default) or 'a' for links */
  as?: 'button' | 'a';
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
}
export function Button(props: ButtonProps): JSX.Element;
