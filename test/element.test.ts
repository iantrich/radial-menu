import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('custom-card-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('custom-card-helpers')>();
  return { ...actual, handleAction: vi.fn(), applyThemesOnElement: vi.fn() };
});

import { applyThemesOnElement, handleAction } from 'custom-card-helpers';
import type { RadialMenu } from '../src/radial-menu';

const createCardElement = vi.fn((cardConfig: Record<string, unknown>) => {
  const el = document.createElement('div') as HTMLElement & { hass?: unknown };
  el.dataset.cardType = String(cardConfig.type);
  return el;
});

beforeAll(async () => {
  for (const tag of ['ha-icon', 'state-badge']) {
    if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
  }
  (window as any).loadCardHelpers = vi.fn(async () => ({ createCardElement }));
  // Silence the version banner and Lit's dev-mode notice emitted at import time.
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await import('../src/radial-menu');
  info.mockRestore();
  warn.mockRestore();
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

async function mount(config: Record<string, unknown>): Promise<RadialMenu> {
  const el = document.createElement('radial-menu') as RadialMenu;
  el.setConfig(config as any);
  document.body.appendChild(el);
  await el.updateComplete;
  await flush();
  await el.updateComplete;
  return el;
}

const $ = (el: RadialMenu, selector: string): HTMLElement | null =>
  el.shadowRoot!.querySelector(selector) as HTMLElement | null;
const $$ = (el: RadialMenu, selector: string): HTMLElement[] =>
  Array.from(el.shadowRoot!.querySelectorAll(selector)) as HTMLElement[];

const pointer = (target: EventTarget, type: string, init: PointerEventInit = {}): void => {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, composed: true, isPrimary: true, button: 0, pointerId: 1, ...init }),
  );
};
const tap = (target: EventTarget): void => {
  pointer(target, 'pointerdown');
  pointer(target, 'pointerup');
};

const hass = (extra: Record<string, unknown> = {}): any => ({ themes: {}, states: {}, ...extra });

const items = [
  { icon: 'mdi:lightbulb', name: 'Light', entity: 'light.a', tap_action: { action: 'toggle' } },
  { icon: 'mdi:fan', name: 'Fan', entity: 'fan.b' },
];

describe('radial-menu element', () => {
  beforeEach(() => {
    vi.mocked(handleAction).mockClear();
    vi.mocked(applyThemesOnElement).mockClear();
    createCardElement.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('(a) default_open survives hass arriving after setConfig (#26)', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    expect(el.open).toBe(true);
    el.hass = hass();
    await el.updateComplete;
    el.hass = hass();
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect($(el, '.circle')!.classList.contains('open')).toBe(true);
  });

  it('(b) renders item icons and the menu button without hass', async () => {
    const el = await mount({ type: 'custom:radial-menu', items });
    const icons = $$(el, '.circle ha-icon') as Array<HTMLElement & { icon?: string }>;
    expect(icons.map((i) => i.icon)).toEqual(['mdi:lightbulb', 'mdi:fan']);
    expect(icons[0].style.left).toBe('50.0000%');
    expect(icons[0].style.top).toBe('15.0000%');
    expect(($(el, 'ha-icon.menu-button') as any).icon).toBe('mdi:menu');
    expect(($(el, 'ha-icon.menu-button') as any).menu).toBe(true);
  });

  it('renders entity_picture items with state-badge and the fake stateObj', async () => {
    const el = await mount({
      type: 'custom:radial-menu',
      entity_picture: '/local/me.png',
      items: [{ entity_picture: '/local/a.png', name: 'A' }],
    });
    const badge = $(el, '.circle state-badge') as any;
    expect(badge.stateObj).toEqual({ attributes: { entity_picture: '/local/a.png' }, entity_id: 'sensor.fake' });
    const button = $(el, 'state-badge.menu-button') as any;
    expect(button.stateObj.attributes.entity_picture).toBe('/local/me.png');
    expect(button.menu).toBe(true);
  });

  it('(c) caches card elements across hass updates and rebuilds when card config changes', async () => {
    const cardItems = [{ card: { type: 'entities', entities: [] } }, { icon: 'mdi:fan' }];
    const el = await mount({ type: 'custom:radial-menu', items: cardItems });
    expect(createCardElement).toHaveBeenCalledTimes(1);
    const card = $(el, '.custom > div') as HTMLElement & { hass?: unknown };
    expect(card).not.toBeNull();

    const h1 = hass();
    el.hass = h1;
    await el.updateComplete;
    expect(card.hass).toBe(h1);
    const h2 = hass();
    el.hass = h2;
    await el.updateComplete;
    expect(card.hass).toBe(h2);
    expect(createCardElement).toHaveBeenCalledTimes(1);
    expect($(el, '.custom > div')).toBe(card);

    el.setConfig({ type: 'custom:radial-menu', items: [{ card: { type: 'glance' } }, cardItems[1]] } as any);
    await el.updateComplete;
    expect(createCardElement).toHaveBeenCalledTimes(2);
    const next = $(el, '.custom > div') as HTMLElement & { hass?: unknown };
    expect(next).not.toBe(card);
    expect(next.dataset.cardType).toBe('glance');
    expect(next.hass).toBe(h2);
  });

  it('(d) tapping an item calls handleAction and dismisses; the button toggles without handleAction', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    const h = hass();
    el.hass = h;
    await el.updateComplete;

    tap($$(el, '.circle ha-icon')[0]);
    await el.updateComplete;
    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction).toHaveBeenCalledWith(el, h, items[0], 'tap');
    expect(el.open).toBe(false);

    const button = $(el, '.menu-button')!;
    tap(button);
    await el.updateComplete;
    expect(el.open).toBe(true);
    tap(button);
    await el.updateComplete;
    expect(el.open).toBe(false);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('(d) keeps the menu open after an item tap when default_dismiss is false', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, default_dismiss: false, items });
    el.hass = hass();
    await el.updateComplete;
    tap($$(el, '.circle ha-icon')[1]);
    await el.updateComplete;
    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(el.open).toBe(true);
  });

  it('a long press on an item without hold_action goes to handleAction with hold', async () => {
    vi.useFakeTimers();
    const el = await (async () => {
      const m = document.createElement('radial-menu') as RadialMenu;
      m.setConfig({ type: 'custom:radial-menu', default_open: true, items } as any);
      document.body.appendChild(m);
      await m.updateComplete;
      return m;
    })();
    const h = hass();
    el.hass = h;
    await el.updateComplete;
    const icon = $$(el, '.circle ha-icon')[1];
    pointer(icon, 'pointerdown');
    vi.advanceTimersByTime(600);
    pointer(icon, 'pointerup');
    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction).toHaveBeenCalledWith(el, h, items[1], 'hold');
  });

  it('prevents the context menu on interactive items', async () => {
    const el = await mount({ type: 'custom:radial-menu', items });
    const ev = new Event('contextmenu', { bubbles: true, cancelable: true, composed: true });
    $$(el, '.circle ha-icon')[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('(e) closes on outside pointerdown by default, not on inside pointerdown', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    pointer($$(el, '.circle ha-icon')[0], 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(true);
    pointer(el, 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(true);
    pointer(document.body, 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(false);
  });

  it('(e) ignores outside pointerdown with close_on_outside_click: false', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, close_on_outside_click: false, items });
    pointer(document.body, 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(true);
  });

  it('(f) removing the element removes the document pointerdown listener', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    const added = add.mock.calls.find(([type]) => type === 'pointerdown');
    expect(added).toBeDefined();
    expect(added![2]).toEqual({ capture: true });
    el.remove();
    const removed = remove.mock.calls.find(([type]) => type === 'pointerdown');
    expect(removed).toBeDefined();
    expect(removed![1]).toBe(added![1]);
    expect(removed![2]).toEqual({ capture: true });
    pointer(document.body, 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(true);
    add.mockRestore();
    remove.mockRestore();
  });

  it('(e) an ancestor stopping pointerdown propagation does not prevent the outside close', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    const container = document.createElement('div');
    const outside = document.createElement('button');
    container.appendChild(outside);
    container.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    document.body.appendChild(container);
    pointer(outside, 'pointerdown');
    await el.updateComplete;
    expect(el.open).toBe(false);
  });

  it('ignores non-primary buttons: a right click does not run the tap action', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    el.hass = hass();
    await el.updateComplete;
    const icon = $$(el, '.circle ha-icon')[0];
    pointer(icon, 'pointerdown', { button: 2 });
    pointer(icon, 'pointerup', { button: 2 });
    pointer(icon, 'pointerdown', { button: 1 });
    pointer(icon, 'pointerup', { button: 1 });
    pointer(icon, 'pointerdown', { isPrimary: false });
    pointer(icon, 'pointerup', { isPrimary: false });
    expect(handleAction).not.toHaveBeenCalled();
    tap(icon);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('releases implicit pointer capture on pointerdown', async () => {
    const el = await mount({ type: 'custom:radial-menu', items });
    const icon = $$(el, '.circle ha-icon')[0] as any;
    const release = vi.fn();
    icon.hasPointerCapture = vi.fn(() => true);
    icon.releasePointerCapture = release;
    pointer(icon, 'pointerdown', { pointerId: 7 });
    expect(release).toHaveBeenCalledWith(7);
  });

  it('sliding off an item aborts the press', async () => {
    const el = await mount({ type: 'custom:radial-menu', default_open: true, items });
    el.hass = hass();
    await el.updateComplete;
    const icon = $$(el, '.circle ha-icon')[0];
    pointer(icon, 'pointerdown');
    pointer(icon, 'pointerleave', { bubbles: false });
    pointer(document.body, 'pointerup');
    pointer(icon, 'pointerup');
    expect(handleAction).not.toHaveBeenCalled();
  });

  it('a stale press never turns into a hold; the next press is exactly one tap', async () => {
    vi.useFakeTimers();
    const el = document.createElement('radial-menu') as RadialMenu;
    el.setConfig({ type: 'custom:radial-menu', default_open: true, default_dismiss: false, items } as any);
    document.body.appendChild(el);
    await el.updateComplete;
    const h = hass();
    el.hass = h;
    await el.updateComplete;
    const [a, b] = $$(el, '.circle ha-icon');
    pointer(a, 'pointerdown');
    pointer(a, 'pointerleave', { bubbles: false });
    vi.advanceTimersByTime(1000);
    pointer(a, 'pointerup');
    tap(b);
    tap(a);
    expect(vi.mocked(handleAction).mock.calls.map((call) => call[3])).toEqual(['tap', 'tap']);
    expect(vi.mocked(handleAction).mock.calls[1]).toEqual([el, h, items[0], 'tap']);
  });

  it('a failing loadCardHelpers is logged, not unhandled, and a later setConfig retries', async () => {
    const original = (window as any).loadCardHelpers;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).loadCardHelpers = vi.fn(async () => {
      throw new Error('boom');
    });
    try {
      const cardItems = [{ card: { type: 'entities', entities: [] } }];
      const el = await mount({ type: 'custom:radial-menu', items: cardItems });
      expect(error).toHaveBeenCalledTimes(1);
      expect($(el, '.custom')).toBeNull();

      (window as any).loadCardHelpers = original;
      el.setConfig({ type: 'custom:radial-menu', items: cardItems } as any);
      await flush();
      await el.updateComplete;
      expect(createCardElement).toHaveBeenCalledTimes(1);
      expect($(el, '.custom > div')).not.toBeNull();
      expect(error).toHaveBeenCalledTimes(1);
    } finally {
      (window as any).loadCardHelpers = original;
      error.mockRestore();
    }
  });

  it('(g) size sets --radial-size on the box', async () => {
    const el = await mount({ type: 'custom:radial-menu', size: '100%', items });
    expect($(el, '.circular-menu')!.style.getPropertyValue('--radial-size')).toBe('100%');
    const def = await mount({ type: 'custom:radial-menu', items });
    expect($(def, '.circular-menu')!.style.getPropertyValue('--radial-size')).toBe('250px');
  });

  it('(h) per-item color sets that item color', async () => {
    const el = await mount({
      type: 'custom:radial-menu',
      items: [{ icon: 'mdi:a', color: 'red' }, { icon: 'mdi:b' }],
    });
    const [a, b] = $$(el, '.circle ha-icon');
    expect(a.style.getPropertyValue('--radial-item-color')).toBe('red');
    expect(b.style.getPropertyValue('--radial-item-color')).toBe('');
  });

  it('(i) setConfig called again does not close an open menu', async () => {
    const el = await mount({ type: 'custom:radial-menu', items });
    expect(el.open).toBe(false);
    tap($(el, '.menu-button')!);
    await el.updateComplete;
    expect(el.open).toBe(true);
    el.setConfig({ type: 'custom:radial-menu', items } as any);
    el.setConfig({ type: 'custom:radial-menu', default_open: false, items } as any);
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect($(el, '.circle')!.classList.contains('open')).toBe(true);
  });

  it('(j) a single item with arc 90 renders without error', async () => {
    const el = await mount({ type: 'custom:radial-menu', arc: 90, start_angle: 90, items: [{ icon: 'mdi:a' }] });
    const icons = $$(el, '.circle ha-icon');
    expect(icons).toHaveLength(1);
    expect(icons[0].style.left).toBe('85.0000%');
    expect(icons[0].style.top).toBe('50.0000%');
  });

  it('renders only the menu button for empty or invalid items', async () => {
    const empty = await mount({ type: 'custom:radial-menu', items: [] });
    expect($$(empty, '.circle > *')).toHaveLength(0);
    expect($(empty, '.menu-button')).not.toBeNull();
    const junk = await mount({ type: 'custom:radial-menu', items: [null, 'x', 3] });
    expect($$(junk, '.circle > *')).toHaveLength(0);
    expect($(junk, '.menu-button')).not.toBeNull();
  });

  it('throws the 1.6.0 error without items', () => {
    const el = document.createElement('radial-menu') as RadialMenu;
    expect(() => el.setConfig({ type: 'custom:radial-menu' } as any)).toThrow(
      'Invalid configuration: No items defined',
    );
  });

  it('applies themes when hass themes change', async () => {
    const el = await mount({ type: 'custom:radial-menu', theme: 'dark', items });
    const themes = { default_theme: 'x', themes: {} };
    el.hass = hass({ themes });
    await el.updateComplete;
    expect(applyThemesOnElement).toHaveBeenCalledWith(el, themes, 'dark');
    el.hass = hass({ themes });
    await el.updateComplete;
    expect(applyThemesOnElement).toHaveBeenCalledTimes(1);
  });

  it('exposes card API: getCardSize, stub config, editor, customCards', async () => {
    const ctor = customElements.get('radial-menu') as any;
    const el = document.createElement('radial-menu') as RadialMenu;
    expect(el.getCardSize()).toBe(1);
    expect(Array.isArray(ctor.getStubConfig().items)).toBe(true);
    expect(ctor.getConfigElement().tagName.toLowerCase()).toBe('radial-menu-editor');
    expect((window as any).customCards.some((c: any) => c.type === 'radial-menu' && c.name === 'Radial Menu')).toBe(
      true,
    );
  });
});
