import type { CSSProperties } from 'react';

/**
 * Tab strip; the active tab is a filled chamfered slab sitting on the rule.
 */
export interface TabsProps {
  items?: Array<string | { value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  tone?: 'light' | 'dark';
  style?: CSSProperties;
}
export function Tabs(props: TabsProps): JSX.Element;
