import type { CSSProperties } from 'react';
import type { IconName } from '../core/Icon';

/** Transient confirmation strip. */
export interface ToastProps {
  tone?: 'neutral' | 'success' | 'danger';
  title?: string;
  message?: string;
  icon?: IconName;
  onClose?: () => void;
  style?: CSSProperties;
}
export function Toast(props: ToastProps): JSX.Element;
