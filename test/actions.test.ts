import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { normalizeActionConfig } from '../src/actions';
import type { RadialMenu } from '../src/radial-menu';

// These tests use the REAL handleAction from custom-card-helpers, with only hass.callService spied.

beforeAll(async () => {
  for (const tag of ['ha-icon', 'state-badge']) {
    if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
  }
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await import('../src/radial-menu');
  info.mockRestore();
  warn.mockRestore();
});

afterEach(() => {
  document.body.innerHTML = '';
});

async function mountWithItem(item: Record<string, unknown>): Promise<{ el: RadialMenu; callService: any }> {
  const el = document.createElement('radial-menu') as RadialMenu;
  const config = { type: 'custom:radial-menu', default_open: true, items: [item] };
  const snapshot = structuredClone(config);
  el.setConfig(config as any);
  const callService = vi.fn();
  el.hass = { themes: { default_theme: 'default', themes: {} }, states: {}, callService } as any;
  document.body.appendChild(el);
  await el.updateComplete;
  const icon = el.shadowRoot!.querySelector('.circle ha-icon')!;
  for (const type of ['pointerdown', 'pointerup']) {
    icon.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, isPrimary: true, button: 0 }));
  }
  // The user's config object is never mutated.
  expect(config).toEqual(snapshot);
  return { el, callService };
}

describe('actions through the real handleAction', () => {
  it('call-service with 1.6.0 service_data passes it as data', async () => {
    const { callService } = await mountWithItem({
      icon: 'mdi:alarm',
      tap_action: { action: 'call-service', service: 'timer.start', service_data: { entity_id: 'timer.laundry' } },
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('timer', 'start', { entity_id: 'timer.laundry' }, undefined);
  });

  it('perform-action (ui_action selector output) calls the service with data and target', async () => {
    const data = { brightness_pct: 50 };
    const target = { entity_id: 'light.kitchen' };
    const { callService } = await mountWithItem({
      icon: 'mdi:lightbulb',
      tap_action: { action: 'perform-action', perform_action: 'light.turn_on', data, target },
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', data, target);
  });
});

describe('normalizeActionConfig', () => {
  it('maps perform-action to call-service and keeps other fields', () => {
    const input = {
      action: 'perform-action',
      perform_action: 'light.turn_on',
      data: { a: 1 },
      target: { entity_id: 'light.x' },
      haptic: 'success',
    };
    const snapshot = structuredClone(input);
    const out = normalizeActionConfig(input as any) as any;
    expect(out).toMatchObject({
      action: 'call-service',
      service: 'light.turn_on',
      data: { a: 1 },
      target: { entity_id: 'light.x' },
      haptic: 'success',
    });
    expect(input).toEqual(snapshot);
  });

  it('copies service_data into data, preferring an explicit data', () => {
    const legacy = { action: 'call-service', service: 'timer.start', service_data: { entity_id: 'timer.a' } };
    const snapshot = structuredClone(legacy);
    expect((normalizeActionConfig(legacy as any) as any).data).toEqual({ entity_id: 'timer.a' });
    expect(legacy).toEqual(snapshot);
    const both = { action: 'call-service', service: 'x.y', data: { d: 1 }, service_data: { s: 1 } };
    expect((normalizeActionConfig(both as any) as any).data).toEqual({ d: 1 });
  });

  it('leaves other actions and missing configs alone', () => {
    const nav = { action: 'navigate', navigation_path: '/lovelace/1', haptic: 'light' };
    expect(normalizeActionConfig(nav as any)).toBe(nav);
    const toggle = { action: 'toggle' };
    expect(normalizeActionConfig(toggle as any)).toBe(toggle);
    expect(normalizeActionConfig(undefined)).toBeUndefined();
  });
});
