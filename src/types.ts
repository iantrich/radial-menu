import { ActionConfig, LovelaceCardConfig } from 'custom-card-helpers';

export interface RadialMenuConfig {
  type: string;
  name?: string;
  icon?: string;
  entity_picture?: string;
  entity?: string;
  default_open?: boolean;
  default_dismiss?: boolean;
  tap_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  items: RadialMenuItemConfig[];
  theme?: string;
  items_offset?: number;
  /** Any CSS length; a number is taken as pixels. */
  size?: string | number;
  start_angle?: number;
  arc?: number;
  close_on_outside_click?: boolean;
}

export interface RadialMenuItemConfig {
  icon?: string;
  entity_picture?: string;
  name?: string;
  entity?: string;
  tap_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  card?: LovelaceCardConfig;
  color?: string;
}
