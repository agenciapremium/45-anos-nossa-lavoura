import type { CSSProperties, ReactNode } from 'react';

/** On/off toggle with a chamfered track and octagon knob. */
export interface SwitchProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export function Switch(props: SwitchProps): JSX.Element;
