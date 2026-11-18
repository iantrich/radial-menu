import { ActionConfig } from 'custom-card-helpers';
import { RadialMenuConfig, RadialMenuItemConfig } from './types';

export type ResolvedConfig = Required<
  Pick<
    RadialMenuConfig,
    | 'icon'
    | 'name'
    | 'tap_action'
    | 'hold_action'
    | 'double_tap_action'
    | 'default_dismiss'
    | 'items_offset'
    | 'size'
    | 'start_angle'
    | 'arc'
    | 'close_on_outside_click'
  >
> &
  RadialMenuConfig;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function normalizeConfig(config: unknown): ResolvedConfig {
  if (!config) {
    throw new Error('Invalid configuration');
  }
  const input = config as RadialMenuConfig;
  if (!Array.isArray(input.items)) {
    throw new Error('Invalid configuration: No items defined');
  }

  return {
    icon: 'mdi:menu',
    name: 'menu',
    // 'toggle-menu' is a card-specific action, not part of ActionConfig.
    tap_action: { action: 'toggle-menu' } as unknown as ActionConfig,
    hold_action: { action: 'none' },
    double_tap_action: { action: 'none' },
    default_dismiss: true,
    items_offset: 35,
    size: '250px',
    start_angle: 0,
    arc: 360,
    close_on_outside_click: true,
    ...input,
    items: input.items.filter((item): item is RadialMenuItemConfig => isPlainObject(item)),
  };
}
