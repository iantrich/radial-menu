import { LitElement, PropertyValues, TemplateResult, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  ActionConfig,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  applyThemesOnElement,
  handleAction,
  hasAction,
} from 'custom-card-helpers';

import { normalizeActions } from './actions';
import { ResolvedConfig, normalizeConfig } from './config';
import { CARD_VERSION } from './const';
import './editor';
import { Gesture, GestureAction } from './gesture';
import { itemPosition } from './layout';
import { styles } from './styles';
import { RadialMenuConfig, RadialMenuItemConfig } from './types';

/* eslint no-console: 0 */
console.info(
  `%c  RADIAL-MENU   \n%c  Version ${CARD_VERSION} `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

interface CachedCard {
  config: LovelaceCardConfig;
  element: LovelaceCard;
}

type ActionTarget = RadialMenuConfig | RadialMenuItemConfig;

const BUTTON = -1;
// Capture phase, so an ancestor stopping pointerdown propagation cannot block the outside close.
const CAPTURE: AddEventListenerOptions = { capture: true };

@customElement('radial-menu')
export class RadialMenu extends LitElement {
  static styles = styles;

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() public open = false;
  @state() private _config?: ResolvedConfig;
  @state() private _helpers?: CardHelpers;

  private _helpersRequested = false;
  private _helpersErrorLogged = false;
  private _cards = new Map<number, CachedCard>();
  private _gestures = new Map<number, Gesture>();

  public static getConfigElement(): HTMLElement {
    return document.createElement('radial-menu-editor');
  }

  public static getStubConfig(): RadialMenuConfig {
    return {
      type: 'custom:radial-menu',
      items: [
        { icon: 'mdi:lightbulb-outline', name: 'Lights', tap_action: { action: 'none' } },
        { icon: 'mdi:fan', name: 'Fan', tap_action: { action: 'none' } },
        { icon: 'mdi:television', name: 'TV', tap_action: { action: 'none' } },
      ],
    };
  }

  public setConfig(config: RadialMenuConfig): void {
    const resolved = normalizeConfig(config);
    if (!this._config) this.open = !!resolved.default_open;
    this._config = resolved;

    this._disposeGestures();
    this._gestures.set(BUTTON, this._createGesture(resolved, true));
    resolved.items.forEach((item, index) => {
      if (!item.card) this._gestures.set(index, this._createGesture(item, false));
    });

    if (!this._helpers && !this._helpersRequested && resolved.items.some((item) => item.card)) {
      this._helpersRequested = true;
      this._loadCardHelpers();
    }
  }

  public getCardSize(): number {
    return 1;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('pointerdown', this._onDocumentPointerDown, CAPTURE);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this._onDocumentPointerDown, CAPTURE);
    this._gestures.forEach((gesture) => gesture.dispose());
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!this._config) return;
    if (changedProps.has('_config') || changedProps.has('_helpers')) this._syncCards();
    if (this.hass) {
      this._cards.forEach(({ element }) => {
        if (element.hass !== this.hass) element.hass = this.hass;
      });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const layout = { offset: config.items_offset, startAngle: config.start_angle, arc: config.arc };
    const count = config.items.length;

    return html`
      <nav class="circular-menu" style=${styleMap({ '--radial-size': config.size })}>
        <div class="circle ${this.open ? 'open' : ''}">
          ${config.items.map((item, index) => {
            const { left, top } = itemPosition(index, count, layout);
            if (item.card) {
              const cached = this._cards.get(index);
              return cached
                ? html`<div class="custom" style=${styleMap({ left, top })}>${cached.element}</div>`
                : nothing;
            }
            const style = styleMap({ left, top, '--radial-item-color': item.color });
            return this._renderTarget(item, index, style, '');
          })}
        </div>
        ${this._renderTarget(config, BUTTON, nothing, 'menu-button')}
      </nav>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) return;
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (changedProps.has('hass') && (!oldHass || oldHass.themes !== this.hass.themes)) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _renderTarget(target: ActionTarget, key: number, style: unknown, cls: string): TemplateResult {
    const gesture = this._gestures.get(key);
    const down = (ev: PointerEvent): void => {
      // Only the primary pointer's main button (left mouse, touch, pen) starts a gesture.
      if (ev.button !== 0 || !ev.isPrimary) return;
      // Touch pointers are implicitly captured; release so leaving the item fires pointerleave.
      const el = ev.currentTarget as Element | null;
      try {
        if (el?.hasPointerCapture?.(ev.pointerId)) el.releasePointerCapture(ev.pointerId);
      } catch {
        // Capture may already be gone; nothing to release.
      }
      gesture?.down();
    };
    const up = (ev: PointerEvent): void => {
      if (ev.button !== 0 || !ev.isPrimary) return;
      gesture?.up();
    };
    const cancel = (): void => gesture?.cancel();
    const isButton = key === BUTTON;

    // With a real entity, state-badge reflects its state (on/off colors, icon, picture).
    const entityState = target.entity ? this.hass?.states?.[target.entity] : undefined;

    return target.entity_picture || entityState
      ? html`<state-badge
          class=${cls}
          style=${style}
          title=${target.name ?? ''}
          .menu=${isButton}
          .config=${target}
          .stateObj=${entityState ?? { attributes: { entity_picture: target.entity_picture }, entity_id: 'sensor.fake' }}
          .overrideIcon=${target.icon}
          .overrideImage=${target.entity_picture}
          .stateColor=${!!entityState}
          .color=${'color' in target ? target.color : undefined}
          @pointerdown=${down}
          @pointerup=${up}
          @pointercancel=${cancel}
          @pointerleave=${cancel}
          @contextmenu=${this._preventContextMenu}
        ></state-badge>`
      : html`<ha-icon
          class=${cls}
          style=${style}
          .menu=${isButton}
          .config=${target}
          .icon=${target.icon}
          .title=${target.name ?? ''}
          @pointerdown=${down}
          @pointerup=${up}
          @pointercancel=${cancel}
          @pointerleave=${cancel}
          @contextmenu=${this._preventContextMenu}
        ></ha-icon>`;
  }

  private _createGesture(target: ActionTarget, isButton: boolean): Gesture {
    return new Gesture({
      hasDoubleTap: hasAction(target.double_tap_action),
      emit: (action) => this._handleAction(target, action, isButton),
    });
  }

  private _handleAction(target: ActionTarget, action: GestureAction, isButton: boolean): void {
    const actionConfig = target[`${action}_action`] as ActionConfig | undefined;
    if ((actionConfig?.action as string | undefined) === 'toggle-menu') {
      this.open = !this.open;
      return;
    }
    // Normalized copy: handleAction ignores `service_data` and has no `perform-action` case.
    if (this.hass) handleAction(this, this.hass, normalizeActions(target), action);
    if (this._config?.default_dismiss && !isButton) this.open = false;
  }

  private _onDocumentPointerDown = (ev: Event): void => {
    if (!this.open || !this._config?.close_on_outside_click) return;
    if (ev.composedPath().includes(this)) return;
    this.open = false;
  };

  private _preventContextMenu(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  private _syncCards(): void {
    const items = this._config!.items;
    for (const index of [...this._cards.keys()]) {
      if (items[index]?.card !== this._cards.get(index)!.config) this._cards.delete(index);
    }
    if (!this._helpers) return;
    items.forEach((item, index) => {
      if (!item.card || this._cards.has(index)) return;
      this._cards.set(index, { config: item.card, element: this._helpers!.createCardElement(item.card) });
    });
  }

  private async _loadCardHelpers(): Promise<void> {
    const load = (window as any).loadCardHelpers as (() => Promise<CardHelpers>) | undefined;
    try {
      if (typeof load !== 'function') throw new Error('window.loadCardHelpers is not available');
      this._helpers = await load();
    } catch (err) {
      if (!this._helpersErrorLogged) {
        this._helpersErrorLogged = true;
        console.error('radial-menu: could not load card helpers for card items', err);
      }
      // Allow a later setConfig to try again.
      this._helpersRequested = false;
    }
  }

  private _disposeGestures(): void {
    this._gestures.forEach((gesture) => gesture.dispose());
    this._gestures.clear();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'radial-menu': RadialMenu;
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'radial-menu',
  name: 'Radial Menu',
  description: 'A radial menu of shortcuts that pops out of a single button.',
});
