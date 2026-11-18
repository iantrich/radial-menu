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
    | 'start_angle'
    | 'arc'
    | 'close_on_outside_click'
  >
> &
  Omit<RadialMenuConfig, 'size'> & { size: string };

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

  // A blank YAML key (`items_offset:`) is null; let the default apply instead.
  const present = Object.fromEntries(Object.entries(input).filter(([, value]) => value != null)) as RadialMenuConfig;
  const size = typeof input.size === 'number' ? `${input.size}px` : (input.size ?? '250px');

  return {
    icon: 'mdi:menu',
    name: 'menu',
    // 'toggle-menu' is a card-specific action, not part of ActionConfig.
    tap_action: { action: 'toggle-menu' } as unknown as ActionConfig,
    hold_action: { action: 'none' },
    double_tap_action: { action: 'none' },
    default_dismiss: true,
    items_offset: 35,
    start_angle: 0,
    arc: 360,
    close_on_outside_click: true,
    ...present,
    size,
    items: input.items.filter((item): item is RadialMenuItemConfig => isPlainObject(item)),
  };
}
