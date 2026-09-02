import type { CSSProperties } from 'react';

/** Single-choice group; markers are full octagons. */
export interface RadioProps {
  name: string;
  options?: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  direction?: 'row' | 'column';
  style?: CSSProperties;
}
export function Radio(props: RadioProps): JSX.Element;
