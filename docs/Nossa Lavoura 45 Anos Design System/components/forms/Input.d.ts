import type { CSSProperties, ChangeEvent } from 'react';

/**
 * Chamfered single-line text field.
 */
export interface InputProps {
  label?: string;
  hint?: string;
  /** Error message; replaces hint and turns the border danger */
  error?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'search';
  disabled?: boolean;
  required?: boolean;
  id?: string;
  style?: CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
