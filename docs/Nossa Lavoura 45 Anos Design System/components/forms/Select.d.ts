import type { CSSProperties, ChangeEvent } from 'react';

/** Chamfered select; the chevron is the brand's seta pictogram rotated 90°. */
export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<string | { value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
