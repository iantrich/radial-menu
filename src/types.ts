import { ActionConfig, LovelaceCardConfig, LovelaceCard } from 'custom-card-helpers';

export interface RadialMenuConfig {
  type: string;
  name: string;
  icon?: string;
  entity_picture?: string;
  default_open?: boolean;
  default_dismiss?: boolean;
  tap_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  items: RadialMenuItemConfig[];
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
  element?: LovelaceCard;
}
