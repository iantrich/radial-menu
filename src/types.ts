import { ActionConfig, HomeAssistant } from "custom-card-helpers";

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

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  getCardSize(): number;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  type: string;
  [key: string]: any;
}