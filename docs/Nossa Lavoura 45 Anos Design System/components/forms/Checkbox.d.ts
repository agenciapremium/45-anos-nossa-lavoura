import type { CSSProperties, ReactNode } from 'react';

/** Chamfered checkbox. */
export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
