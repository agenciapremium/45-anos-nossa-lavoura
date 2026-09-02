import type { CSSProperties, ReactNode } from 'react';

/**
 * Modal dialog with a large chamfer over a terra scrim.
 */
export interface DialogProps {
  open?: boolean;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
  style?: CSSProperties;
}
export function Dialog(props: DialogProps): JSX.Element | null;
