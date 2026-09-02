import type { CSSProperties, ReactNode } from 'react';
import type { IconName } from './Icon';

/** Content / product card on the rounded Panel surface. */
export interface CardProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  badge?: string;
  icon?: IconName;
  image?: string;
  imageAlt?: string;
  tone?: 'card' | 'creme' | 'terra' | 'accent';
  radius?: string;
  footer?: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}
export function Card(props: CardProps): JSX.Element;
