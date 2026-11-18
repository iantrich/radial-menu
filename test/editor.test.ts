import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RadialMenuEditor } from '../src/editor';

type Form = HTMLElement & { data?: Record<string, unknown>; schema?: Array<{ name: string }>; hass?: unknown };

beforeAll(async () => {
  if (!customElements.get('ha-form')) customElements.define('ha-form', class extends HTMLElement {});
  // Silence Lit's dev-mode notice emitted at import time.
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await import('../src/editor');
  warn.mockRestore();
});

afterEach(() => {
  document.body.innerHTML = '';
});

const cardItem = { card: { type: 'entities', entities: ['light.a', { entity: 'fan.b', name: 'Fan' }] } };

const baseConfig = (): Record<string, any> => ({
  type: 'custom:radial-menu',
  name: 'Menu',
  theme: 'dark',
  foo: { bar: [1, 2] },
  items: [
    { icon: 'mdi:a', name: 'A', extra: 'keep-a' },
    JSON.parse(JSON.stringify(cardItem)),
    { icon: 'mdi:c', name: 'C' },
  ],
});

async function mount(config: Record<string, unknown>): Promise<{ el: RadialMenuEditor; events: any[] }> {
  const el = document.createElement('radial-menu-editor') as RadialMenuEditor;
  const events: any[] = [];
  el.addEventListener('config-changed', (ev) => events.push((ev as CustomEvent).detail.config));
  el.setConfig(config as any);
  el.hass = { states: {} } as any;
  document.body.appendChild(el);
  await el.updateComplete;
  return { el, events };
}

const $ = <T extends HTMLElement = HTMLElement>(el: RadialMenuEditor, sel: string): T =>
  el.shadowRoot!.querySelector(sel) as T;
const $$ = <T extends HTMLElement = HTMLElement>(el: RadialMenuEditor, sel: string): T[] =>
  Array.from(el.shadowRoot!.querySelectorAll(sel)) as T[];

const formChange = (form: HTMLElement, value: Record<string, unknown>): void => {
  form.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
};

const rowButton = (el: RadialMenuEditor, index: number, cls: string): HTMLElement =>
  $$(el, '.item')[index].querySelector(`.${cls}`) as HTMLElement;

describe('radial-menu-editor', () => {
  it('renders a top-level ha-form with the option schema, hass and data', async () => {
    const config = baseConfig();
    const { el } = await mount(config);
    const form = $<Form>(el, 'ha-form.options');
    expect(form.hass).toBe(el.hass);
    expect(form.data).toMatchObject({ name: 'Menu' });
    expect(form.schema!.map((s) => s.name)).toEqual([
      'name',
      'icon',
      'entity_picture',
      'entity',
      'default_open',
      'default_dismiss',
      'close_on_outside_click',
      'items_offset',
      'size',
      'start_angle',
      'arc',
      'tap_action',
      'hold_action',
      'double_tap_action',
    ]);
    const tap = form.schema!.find((s) => s.name === 'tap_action') as any;
    expect(tap.selector).toEqual({ ui_action: {} });
  });

  it('changing a top-level field fires config-changed keeping every other key, including unknown ones', async () => {
    const config = baseConfig();
    const { el, events } = await mount(config);
    const form = $<Form>(el, 'ha-form.options');
    formChange(form, { ...form.data, name: 'Renamed' });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ ...baseConfig(), name: 'Renamed' });
    expect(events[0].theme).toBe('dark');
    expect(events[0].foo).toEqual({ bar: [1, 2] });
    // The incoming config is not mutated.
    expect(config.name).toBe('Menu');
  });

  it('clearing a top-level field removes only that key', async () => {
    const { el, events } = await mount({ ...baseConfig(), size: '100px' });
    const form = $<Form>(el, 'ha-form.options');
    const rest = { ...form.data };
    delete rest.size;
    formChange(form, rest);
    expect(events[0]).toEqual(baseConfig());
    expect('size' in events[0]).toBe(false);
  });

  it('renders a per-item ha-form with item schema and an action selector', async () => {
    const { el } = await mount(baseConfig());
    const forms = $$<Form>(el, '.item ha-form');
    expect(forms).toHaveLength(2);
    expect(forms[0].data).toMatchObject({ icon: 'mdi:a', name: 'A' });
    expect(forms[0].schema!.map((s) => s.name)).toEqual([
      'icon',
      'entity_picture',
      'name',
      'entity',
      'color',
      'tap_action',
      'hold_action',
      'double_tap_action',
    ]);
    expect((forms[0].schema!.find((s) => s.name === 'hold_action') as any).selector).toEqual({ ui_action: {} });
  });

  it('editing an item merges into that item and keeps its unknown keys', async () => {
    const { el, events } = await mount(baseConfig());
    const form = $$<Form>(el, '.item ha-form')[0];
    formChange(form, { ...form.data, name: 'A2', tap_action: { action: 'toggle' } });
    const expected = baseConfig();
    expected.items[0] = { icon: 'mdi:a', name: 'A2', extra: 'keep-a', tap_action: { action: 'toggle' } };
    expect(events[0]).toEqual(expected);
  });

  it('adding an item appends an icon-shaped default', async () => {
    const { el, events } = await mount(baseConfig());
    $(el, '.add').click();
    expect(events).toHaveLength(1);
    expect(events[0].items).toHaveLength(4);
    expect(events[0].items.slice(0, 3)).toEqual(baseConfig().items);
    expect(Object.keys(events[0].items[3])).toEqual(['icon']);
    expect(events[0].items[3].icon).toMatch(/^mdi:.+/);
    expect(events[0].theme).toBe('dark');
  });

  it('removing an item drops exactly that item', async () => {
    const { el, events } = await mount(baseConfig());
    rowButton(el, 0, 'remove').click();
    const [, card, c] = baseConfig().items;
    expect(events[0].items).toEqual([card, c]);
  });

  it('moving items up and down reorders them', async () => {
    const { el, events } = await mount(baseConfig());
    const [a, card, c] = baseConfig().items;
    rowButton(el, 2, 'move-up').click();
    expect(events[0].items).toEqual([a, c, card]);
    await el.updateComplete;
    rowButton(el, 0, 'move-down').click();
    expect(events[1].items).toEqual([c, a, card]);
  });

  it('disables move-up on the first row and move-down on the last', async () => {
    const { el } = await mount(baseConfig());
    expect((rowButton(el, 0, 'move-up') as HTMLButtonElement).disabled).toBe(true);
    expect((rowButton(el, 2, 'move-down') as HTMLButtonElement).disabled).toBe(true);
    expect((rowButton(el, 1, 'move-up') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows card items read-only (edit in YAML) and returns them byte-for-byte unchanged', async () => {
    const { el, events } = await mount(baseConfig());
    const rows = $$(el, '.item');
    expect(rows[1].querySelector('ha-form')).toBeNull();
    expect(rows[1].textContent).toMatch(/edit in YAML/i);
    const original = JSON.stringify(cardItem);

    const forms = $$<Form>(el, '.item ha-form');
    formChange(forms[1], { ...forms[1].data, name: 'C2' });
    expect(JSON.stringify(events[0].items[1])).toBe(original);
    el.setConfig(events[0]);
    await el.updateComplete;

    rowButton(el, 0, 'remove').click();
    expect(JSON.stringify(events[1].items[0])).toBe(original);
    el.setConfig(events[1]);
    await el.updateComplete;

    rowButton(el, 1, 'move-up').click();
    expect(JSON.stringify(events[2].items[1])).toBe(original);
    expect(events[2].items[0]).toEqual({ icon: 'mdi:c', name: 'C2' });
  });

  it('fires config-changed as a bubbling, composed event', async () => {
    const { el } = await mount(baseConfig());
    const seen: Event[] = [];
    document.body.addEventListener('config-changed', (ev) => seen.push(ev));
    $(el, '.add').click();
    expect(seen).toHaveLength(1);
    expect(seen[0].bubbles).toBe(true);
    expect(seen[0].composed).toBe(true);
  });
});
