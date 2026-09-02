import type { CSSProperties, ReactNode } from 'react';

/** Selectable or removable chip, used for product filters. */
export interface TagProps {
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
}
export function Tag(props: TagProps): JSX.Element;
