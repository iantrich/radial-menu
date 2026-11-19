import { LitElement, TemplateResult, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { RadialMenuConfig, RadialMenuItemConfig } from './types';

interface SchemaField {
  name: string;
  selector: Record<string, unknown>;
}

type Data = Record<string, unknown>;

const field = (name: string, selector: Record<string, unknown>): SchemaField => ({ name, selector });
const text = { text: {} };
const bool = { boolean: {} };
const num = { number: { mode: 'box' } };
const action = { ui_action: {} };
const actions = ['tap_action', 'hold_action', 'double_tap_action'].map((name) => field(name, action));

const OPTIONS_SCHEMA: SchemaField[] = [
  field('name', text),
  field('icon', { icon: {} }),
  field('entity_picture', text),
  field('entity', { entity: {} }),
  field('default_open', bool),
  field('default_dismiss', bool),
  field('close_on_outside_click', bool),
  field('items_offset', num),
  field('size', text),
  field('start_angle', num),
  field('arc', num),
  ...actions,
];

const ITEM_SCHEMA: SchemaField[] = [
  field('icon', { icon: {} }),
  field('entity_picture', text),
  field('name', text),
  field('entity', { entity: {} }),
  field('color', text),
  ...actions,
];

/** Toggles that default to on: shown on when absent, but only written once the user changes them. */
const OPTION_DEFAULTS: Data = { default_dismiss: true, close_on_outside_click: true };

const NEW_ITEM: RadialMenuItemConfig = { icon: 'mdi:gesture-tap' };

/** A cleared field: the key is removed rather than saved as an empty value. */
const isCleared = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || Number.isNaN(value);

const isEditable = (item: unknown): item is RadialMenuItemConfig =>
  typeof item === 'object' && item !== null && !Array.isArray(item) && !('card' in item);

/** Copy `target`, replacing only the schema's keys with those present in `value`. */
function merge<T extends object>(target: T, value: Data, schema: SchemaField[]): T {
  const next: Data = { ...(target as Data) };
  for (const { name } of schema) {
    if (isCleared(value[name])) delete next[name];
    else next[name] = value[name];
  }
  return next as T;
}

const computeLabel = (schema: SchemaField): string => {
  const label = schema.name.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

@customElement('radial-menu-editor')
export class RadialMenuEditor extends LitElement {
  static styles = css`
    .item {
      border: 1px solid var(--divider-color, #ccc);
      border-radius: 8px;
      margin: 8px 0;
      padding: 8px;
    }
    .item-header {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .item-header .title {
      flex: 1;
      font-weight: 500;
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin: 4px 0 0;
    }
    .yaml {
      color: var(--secondary-text-color);
      font-style: italic;
    }
  `;

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: RadialMenuConfig;

  public setConfig(config: RadialMenuConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) return html``;
    const items: unknown[] = Array.isArray(this._config.items) ? this._config.items : [];
    return html`
      <ha-form
        class="options"
        .hass=${this.hass}
        .data=${{ ...OPTION_DEFAULTS, ...this._config }}
        .schema=${OPTIONS_SCHEMA}
        .computeLabel=${computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>
      <p class="hint">
        Leaving tap action empty keeps the default (toggles the menu). Setting an action replaces toggling.
      </p>
      <h3>Items</h3>
      <div class="items">${items.map((item, index) => this._renderItem(item, index, items.length))}</div>
      <button class="add" @click=${this._addItem}>Add item</button>
    `;
  }

  private _renderItem(item: unknown, index: number, count: number): TemplateResult {
    const editable = isEditable(item);
    return html`
      <div class="item">
        <div class="item-header">
          <span class="title">Item ${index + 1}${editable && item.name ? `: ${item.name}` : ''}</span>
          <button class="move-up" title="Move up" ?disabled=${index === 0} @click=${() => this._move(index, -1)}>
            &uarr;
          </button>
          <button
            class="move-down"
            title="Move down"
            ?disabled=${index === count - 1}
            @click=${() => this._move(index, 1)}
          >
            &darr;
          </button>
          <button class="remove" title="Remove" @click=${() => this._remove(index)}>&times;</button>
        </div>
        ${
          editable
            ? html`<ha-form
                .hass=${this.hass}
                .data=${item}
                .schema=${ITEM_SCHEMA}
                .computeLabel=${computeLabel}
                @value-changed=${(ev: CustomEvent) => this._itemChanged(index, ev)}
              ></ha-form>`
            : html`<div class="yaml">Card item (read-only): edit in YAML.</div>`
        }
      </div>
    `;
  }

  private _optionsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value: Data = { ...(ev.detail.value as Data) };
    // Do not persist a displayed default the user left alone.
    for (const [key, def] of Object.entries(OPTION_DEFAULTS)) {
      if (!(key in this._config!) && value[key] === def) delete value[key];
    }
    this._update(merge(this._config!, value, OPTIONS_SCHEMA));
  }

  private _itemChanged(index: number, ev: CustomEvent): void {
    ev.stopPropagation();
    this._updateItems((items) => {
      items[index] = merge(items[index], ev.detail.value as Data, ITEM_SCHEMA);
    });
  }

  private _addItem(): void {
    this._updateItems((items) => items.push({ ...NEW_ITEM }));
  }

  private _remove(index: number): void {
    this._updateItems((items) => items.splice(index, 1));
  }

  private _move(index: number, delta: number): void {
    this._updateItems((items) => {
      const [item] = items.splice(index, 1);
      items.splice(index + delta, 0, item);
    });
  }

  private _updateItems(mutate: (items: RadialMenuItemConfig[]) => void): void {
    const items = [...(this._config!.items ?? [])];
    mutate(items);
    this._update({ ...this._config!, items });
  }

  private _update(config: RadialMenuConfig): void {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'radial-menu-editor': RadialMenuEditor;
  }
}
