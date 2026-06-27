import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from "custom-card-helpers";

import { registerCustomCard } from "../../shared/register-card";
import { tedCardThemeClass, tedStyleTheme } from "../../shared/theme";
import {
  DEFAULT_NAVBAR_SIZE,
  NAVBAR_CARD_DESCRIPTION,
  NAVBAR_CARD_EDITOR_TYPE,
  NAVBAR_CARD_NAME,
  NAVBAR_CARD_TYPE,
} from "./const";
import { detectEditOrPreview, forceNavbarPadding, removeNavbarPadding } from "./navbar-dom";
import type { NavButtonConfig, NavSection, NavZone, NavbarCardConfig } from "./types";

interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}
declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
  }
}

interface ButtonEntry {
  el: LovelaceCard;
  json: string;
}

const ZONES: NavZone[] = ["left", "center", "right"];

registerCustomCard({
  type: NAVBAR_CARD_TYPE,
  name: NAVBAR_CARD_NAME,
  description: NAVBAR_CARD_DESCRIPTION,
  preview: true,
  documentationURL: "https://github.com/tedr91/HA-Teds-Cards#navbar-card",
});

@customElement(NAVBAR_CARD_TYPE)
export class TedNavbarCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ted-navbar-card-editor");
    return document.createElement(NAVBAR_CARD_EDITOR_TYPE) as LovelaceCardEditor;
  }

  public static getStubConfig(): Omit<NavbarCardConfig, "type"> {
    return {
      sections: [
        {
          placement: "center",
          align: "center",
          buttons: [{ type: "custom:ted-label-button-card", name: "Home", icon: "mdi:home" }],
        },
      ],
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public layout?: string;
  @state() private _config?: NavbarCardConfig;

  private _helpers?: CardHelpers;
  private _buttonEls = new Map<string, ButtonEntry>();
  private _editMode = false;

  public setConfig(config: NavbarCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
    if (this._helpers) this._buildButtonElements();
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: "full", rows: 1, min_rows: 1, max_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._editMode = detectEditOrPreview(this);
    void this._loadHelpers();
    this._applyPadding();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    removeNavbarPadding();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("_config")) {
      this._buildButtonElements();
      this._applyPadding();
    }
    if (changed.has("hass")) this._propagateHass();
  }

  private async _loadHelpers(): Promise<void> {
    if (this._helpers || !window.loadCardHelpers) return;
    this._helpers = await window.loadCardHelpers();
    this._buildButtonElements();
    this.requestUpdate();
  }

  private _thickness(): number {
    return typeof this._config?.size === "number" ? this._config.size : DEFAULT_NAVBAR_SIZE;
  }

  private _alignment(): "top" | "bottom" {
    return this._config?.alignment === "top" ? "top" : "bottom";
  }

  private _barType(): "snap" | "float" {
    return this._config?.bar_type === "float" ? "float" : "snap";
  }

  /** Reserve view padding so dashboard content isn't hidden under the bar. */
  private _applyPadding(): void {
    const margin = this._barType() === "float" ? 16 : 0;
    forceNavbarPadding({
      alignment: this._alignment(),
      px: this._thickness() + margin,
      enabled: !this._editMode,
    });
  }

  /** (Re)build cached embedded button cards, reusing those whose config is unchanged. */
  private _buildButtonElements(): void {
    if (!this._helpers || !this._config) return;
    const next = new Map<string, ButtonEntry>();
    (this._config.sections ?? []).forEach((section, sIdx) => {
      (section.buttons ?? []).forEach((button, bIdx) => {
        const key = `${sIdx}:${bIdx}`;
        const cardConfig = this._buttonCardConfig(button);
        const json = JSON.stringify(cardConfig);
        const existing = this._buttonEls.get(key);
        if (existing && existing.json === json) {
          next.set(key, existing);
          return;
        }
        const el = this._helpers!.createCardElement(cardConfig);
        // Render buttons as grid items so the embedded card fills its cell.
        (el as unknown as { layout?: string }).layout = "grid";
        if (this.hass) el.hass = this.hass;
        next.set(key, { el, json });
      });
    });
    this._buttonEls = next;
  }

  /** Strip the nav-only sizing key so the embedded label-button card stays clean. */
  private _buttonCardConfig(button: NavButtonConfig): LovelaceCardConfig {
    const { nav_button_size, ...cardConfig } = button;
    void nav_button_size;
    return cardConfig as LovelaceCardConfig;
  }

  private _lastPropagatedHass?: HomeAssistant;
  private _propagateHass(): void {
    if (!this.hass || this.hass === this._lastPropagatedHass) return;
    this._lastPropagatedHass = this.hass;
    for (const entry of this._buttonEls.values()) entry.el.hass = this.hass;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    const theme = this._config.theme === "ha" ? "ha" : "ted-style";
    const sections = this._config.sections ?? [];
    const byZone: Record<NavZone, Array<{ section: NavSection; idx: number }>> = {
      left: [],
      center: [],
      right: [],
    };
    sections.forEach((section, idx) => {
      if (section.visible === false) return;
      const zone = ZONES.includes(section.placement as NavZone)
        ? (section.placement as NavZone)
        : "left";
      byZone[zone].push({ section, idx });
    });

    const navClasses = {
      navbar: true,
      [this._alignment()]: true,
      [this._barType()]: true,
      "edit-mode": this._editMode,
    };

    return html`
      <div
        class=${classMap(navClasses)}
        style=${styleMap({ "--nav-size": `${this._thickness()}px` })}
      >
        <ha-card class="navbar-card ${tedCardThemeClass(theme)}">
          ${ZONES.map(
            (zone) => html`
              <div class="zone ${zone}">
                ${byZone[zone].map(({ section, idx }) => this._renderSection(section, idx))}
              </div>
            `,
          )}
        </ha-card>
      </div>
    `;
  }

  private _renderSection(section: NavSection, sIdx: number): TemplateResult {
    const align = section.align ?? "center";
    return html`
      <div class="section align-${align}">
        ${(section.buttons ?? []).map((button, bIdx) => this._renderButton(sIdx, bIdx, button))}
      </div>
    `;
  }

  private _renderButton(sIdx: number, bIdx: number, button: NavButtonConfig): TemplateResult {
    const entry = this._buttonEls.get(`${sIdx}:${bIdx}`);
    const wide = button.nav_button_size === "wide";
    return html`<div class="nav-button ${wide ? "wide" : ""}">${entry ? entry.el : nothing}</div>`;
  }

  static styles = [
    tedStyleTheme,
    css`
      :host {
        display: block;
      }

      .navbar {
        position: fixed;
        left: 0;
        right: 0;
        z-index: 5;
        pointer-events: none;
        box-sizing: border-box;
      }
      .navbar.bottom {
        bottom: 0;
      }
      .navbar.top {
        top: 0;
      }
      .navbar.float {
        padding: 8px;
      }
      /* In the editor / card picker preview, sit inline instead of overlaying. */
      .navbar.edit-mode {
        position: static;
      }

      .navbar-card {
        position: relative;
        pointer-events: auto;
        height: var(--nav-size);
        box-sizing: border-box;
        border-radius: 0;
        overflow: visible;
      }
      .navbar.float .navbar-card {
        max-width: 920px;
        margin: 0 auto;
        border-radius: var(--ted-style-radius, 12px);
      }

      /* Three zones: left pinned to the left edge, right to the right edge, and
         center pinned to the exact horizontal center (independent of side widths). */
      .zone {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .zone.left {
        left: 10px;
      }
      .zone.right {
        right: 10px;
      }
      .zone.center {
        left: 50%;
        transform: translateX(-50%);
      }

      .section {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 100%;
      }
      .section.align-left {
        justify-content: flex-start;
      }
      .section.align-center {
        justify-content: center;
      }
      .section.align-right {
        justify-content: flex-end;
      }

      .nav-button {
        height: calc(var(--nav-size) - 12px);
        width: calc(var(--nav-size) - 12px);
        flex: none;
      }
      .nav-button.wide {
        width: calc((var(--nav-size) - 12px) * 2 + 8px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-navbar-card": TedNavbarCard;
  }
}
