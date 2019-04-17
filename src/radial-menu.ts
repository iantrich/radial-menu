import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  css,
  CSSResult
} from "lit-element";

import { RadialMenuConfig, HomeAssistant } from "./types";
import { handleClick } from "./handle-click";

@customElement("radial-menu")
class RadialMenu extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _config?: RadialMenuConfig;

  public setConfig(config: RadialMenuConfig): void {
    if (!config || !config.items) {
      throw new Error("Invalid configuration");
    }

    this._config = {
      icon: "mdi:menu",
      name: "menu",
      default_dismiss: true,
      ...config
    };
  }

  public getCardSize(): number {
    return 1;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <nav class="circular-menu">
        <div class="circle">
          ${this._config.items.map((item, index) => {
            return item.entity_picture
              ? html`
                  <hui-image
                    @click="${this._handleTap}"
                    .config="${item}"
                    .hass="${this.hass}"
                    .image="${item.entity_picture}"
                    .title="${item.name}"
                    style="
                left:calc(${(
                      50 -
                      35 *
                        Math.cos(
                          -0.5 * Math.PI -
                            2 *
                              (1 / this._config!.items.length) *
                              index *
                              Math.PI
                        )
                    ).toFixed(4) + "%"} - 10px);
                top:calc(${(
                      50 +
                      35 *
                        Math.sin(
                          -0.5 * Math.PI -
                            2 *
                              (1 / this._config!.items.length) *
                              index *
                              Math.PI
                        )
                    ).toFixed(4) + "%"} - 10px);"
                  ></hui-image>
                `
              : html`
                  <ha-icon
                    @click="${this._handleTap}"
                    .config="${item}"
                    .icon="${item.icon}"
                    .title="${item.name}"
                    style="
                left:${(
                      50 -
                      35 *
                        Math.cos(
                          -0.5 * Math.PI -
                            2 *
                              (1 / this._config!.items.length) *
                              index *
                              Math.PI
                        )
                    ).toFixed(4) + "%"};
                top:${(
                      50 +
                      35 *
                        Math.sin(
                          -0.5 * Math.PI -
                            2 *
                              (1 / this._config!.items.length) *
                              index *
                              Math.PI
                        )
                    ).toFixed(4) + "%"};"
                  ></ha-icon>
                `;
          })}
        </div>
        ${this._config.entity_picture
          ? html`
              <hui-image
                class="menu-button"
                .hass="${this.hass}"
                .image="${this._config.entity_picture}"
                .title="${this._config.name}"
                @click="${this._toggleMenu}"
              ></hui-image>
            `
          : html`
              <ha-icon
                class="menu-button"
                .icon="${this._config.icon}"
                .title="${this._config.name}"
                @click="${this._toggleMenu}"
              ></ha-icon>
            `}
      </nav>
    `;
  }

  protected firstUpdated(): void {
    if (this._config && this._config.default_open) {
      this._toggleMenu();
    }
  }

  private _toggleMenu() {
    this.shadowRoot!.querySelector(".circle")!.classList.toggle("open");
  }

  private _handleTap(ev) {
    const config = ev.target.config;
    handleClick(this, this.hass!, config, false);
    if (this._config!.default_dismiss) {
      this._toggleMenu();
    }
  }

  private _handleHold(ev) {
    const config = ev.target.config;
    handleClick(this, this.hass!, config, true);
  }

  static get styles(): CSSResult {
    return css`
      .circular-menu {
        width: 250px;
        height: 250px;
        margin: 0 auto;
        position: relative;
      }

      .circle {
        width: 250px;
        height: 250px;
        opacity: 0;

        -webkit-transform: scale(0);
        -moz-transform: scale(0);
        transform: scale(0);

        -webkit-transition: all 0.4s ease-out;
        -moz-transition: all 0.4s ease-out;
        transition: all 0.4s ease-out;
      }

      .open.circle {
        opacity: 1;
        -webkit-transform: scale(1);
        -moz-transform: scale(1);
        transform: scale(1);
      }

      .circle ha-icon,
      .circle hui-image {
        text-decoration: none;
        display: block;
        height: 40px;
        width: 40px;
        line-height: 40px;
        margin-left: -20px;
        margin-top: -20px;
        position: absolute;
        text-align: center;
        border-radius: 50%;
      }

      .circle hui-image {
        padding: 10px;
      }

      .circle ha-icon:hover {
        color: var(--accent-color);
      }

      .circle hui-image:hover {
        background-color: var(--secondary-background-color);
      }

      ha-icon,
      hui-image {
        cursor: pointer;
        color: var(--primary-color);
      }

      ha-icon {
        cursor: pointer;
      }

      .menu-button {
        position: absolute;
        top: calc(50% - 30px);
        left: calc(50% - 30px);
        text-decoration: none;
        text-align: center;
        border-radius: 50%;
        display: block;
        height: 40px;
        width: 40px;
        line-height: 40px;
        padding: 10px;
      }

      .menu-button:hover {
        background-color: var(--secondary-background-color);
      }
    `;
  }
}
