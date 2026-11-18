import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/config';

describe('normalizeConfig', () => {
  it('throws on a missing config', () => {
    expect(() => normalizeConfig(undefined)).toThrow('Invalid configuration');
  });

  it('throws when items are missing', () => {
    expect(() => normalizeConfig({ type: 'x' })).toThrow('Invalid configuration: No items defined');
  });

  it('fills 1.6.0 defaults and the new 2.0 defaults', () => {
    expect(normalizeConfig({ items: [] })).toEqual({
      icon: 'mdi:menu',
      name: 'menu',
      tap_action: { action: 'toggle-menu' },
      hold_action: { action: 'none' },
      double_tap_action: { action: 'none' },
      default_dismiss: true,
      items_offset: 35,
      size: '250px',
      start_angle: 0,
      arc: 360,
      close_on_outside_click: true,
      items: [],
    });
  });

  it('lets user values override defaults', () => {
    const resolved = normalizeConfig({
      items: [],
      icon: 'mdi:star',
      default_dismiss: false,
      items_offset: 10,
      size: '300px',
      start_angle: 90,
      arc: 180,
      close_on_outside_click: false,
      tap_action: { action: 'none' },
    });
    expect(resolved).toMatchObject({
      icon: 'mdi:star',
      default_dismiss: false,
      items_offset: 10,
      size: '300px',
      start_angle: 90,
      arc: 180,
      close_on_outside_click: false,
      tap_action: { action: 'none' },
    });
  });

  it('filters items down to plain objects', () => {
    const resolved = normalizeConfig({ items: [null, 3, { icon: 'mdi:a' }] });
    expect(resolved.items).toEqual([{ icon: 'mdi:a' }]);
  });

  it('does not mutate its input', () => {
    const input = { items: [null, { icon: 'mdi:a' }] };
    const snapshot = structuredClone(input);
    normalizeConfig(input);
    expect(input).toEqual(snapshot);
  });
});
