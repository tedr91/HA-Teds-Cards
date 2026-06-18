import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { type HomeAssistant, type LovelaceCard, type LovelaceCardEditor } from "custom-card-helpers";

import { registerCustomCard } from "../../shared/register-card";
import { brushedOverlay, tedStyleTheme } from "../../shared/theme";
import {
  APPLE_TV_COMMANDS,
  APP_LAUNCH_SLOTS,
  KALEIDESCAPE_COMMANDS,
  REMOTE_CARD_DESCRIPTION,
  REMOTE_CARD_EDITOR_TYPE,
  REMOTE_CARD_NAME,
  REMOTE_CARD_TYPE,
} from "./const";
import type { RemoteButton, RemoteCardConfig } from "./types";

/** States that count as "not powered on" for a media_player / remote entity. */
const OFF_STATES = ["off", "standby", "unavailable", "unknown"];

/** Resolved Home Assistant service call. */
interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/** mdi icon for each logical button. */
const BUTTON_ICONS: Record<RemoteButton, string> = {
  power: "mdi:power",
  up: "mdi:chevron-up",
  down: "mdi:chevron-down",
  left: "mdi:chevron-left",
  right: "mdi:chevron-right",
  select: "mdi:circle-medium",
  back: "mdi:arrow-left",
  home: "mdi:home-outline",
  menu: "mdi:menu",
  play_pause: "mdi:play-pause",
  rewind: "mdi:rewind",
  fast_forward: "mdi:fast-forward",
  skip_previous: "mdi:skip-previous",
  skip_next: "mdi:skip-next",
  volume_up: "mdi:volume-plus",
  volume_down: "mdi:volume-minus",
};

const BUTTON_LABELS: Record<RemoteButton, string> = {
  power: "Power",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  select: "Select",
  back: "Back",
  home: "Home",
  menu: "Menu",
  play_pause: "Play / Pause",
  rewind: "Rewind",
  fast_forward: "Fast forward",
  skip_previous: "Previous",
  skip_next: "Next",
  volume_up: "Volume up",
  volume_down: "Volume down",
};

/** Subset of Home Assistant's LovelaceGridOptions for the Sections grid layout. */
interface GridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

registerCustomCard({
  type: REMOTE_CARD_TYPE,
  name: REMOTE_CARD_NAME,
  description: REMOTE_CARD_DESCRIPTION,
  preview: false,
  documentationURL: "https://github.com/tedr91/HA-Teds-Cards#remote-card",
});

@customElement(REMOTE_CARD_TYPE)
export class TedRemoteCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ted-remote-card-editor");
    return document.createElement(REMOTE_CARD_EDITOR_TYPE) as LovelaceCardEditor;
  }

  public static getStubConfig(hass: HomeAssistant): Omit<RemoteCardConfig, "type"> {
    const remotes = Object.keys(hass.states).filter((id) => id.startsWith("remote."));
    return { device_family: "apple-tv", remote_entity: remotes[0] ?? "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public layout?: string;
  @state() private _config?: RemoteCardConfig;

  public setConfig(config: RemoteCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (config.device_family !== "apple-tv" && config.device_family !== "kaleidescape") {
      throw new Error("You must choose a device family (apple-tv or kaleidescape)");
    }
    if (!config.remote_entity) {
      throw new Error("You must specify a remote entity");
    }
    if (config.remote_entity.split(".")[0] !== "remote") {
      throw new Error("remote_entity must be a remote.* entity");
    }
    if (config.media_player_entity && config.media_player_entity.split(".")[0] !== "media_player") {
      throw new Error("media_player_entity must be a media_player.* entity");
    }
    this._config = { ...config };
  }

  public getCardSize(): number {
    return 8;
  }

  public getGridOptions(): GridOptions {
    return {
      columns: 6,
      rows: 9,
      min_columns: 4,
      min_rows: 6,
    };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this._config) return false;
    if (changed.has("_config") || changed.has("layout")) return true;
    if (!changed.has("hass")) return false;
    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    if (!oldHass) return true;
    const ids = [this._config.remote_entity, this._config.media_player_entity].filter(
      (id): id is string => !!id,
    );
    return ids.some((id) => oldHass.states[id] !== this.hass?.states[id]);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const themeMode = this._config.theme === "ha" ? "ha" : "ted-style";
    const themeClasses = {
      "ted-card": true,
      "ted-card--theme-ted-style": themeMode === "ted-style",
      "ted-card--theme-ha": themeMode === "ha",
    };

    const stateObj = this.hass.states[this._config.remote_entity];
    if (!stateObj) {
      return html`
        <ha-card class=${classMap(themeClasses)}>
          <div class="not-found">
            Entity not found: <code>${this._config.remote_entity}</code>
          </div>
        </ha-card>
      `;
    }

    const family = this._config.device_family;
    const isAppleTv = family === "apple-tv";
    const isKaleidescape = family === "kaleidescape";
    const isOn = this._isOn();
    const isPlaying = this._isPlaying();
    const name = this._config.name || stateObj.attributes.friendly_name || this._config.remote_entity;
    const showName = this._config.show_name !== false;
    const showStatus = this._config.show_status !== false;
    const scale = typeof this._config.scale === "number" ? this._config.scale : 100;

    const cardStyle: Record<string, string> = { "--rc-scale": String(scale / 100) };
    const isGrid = this.layout === "grid";
    if (!isGrid) cardStyle.margin = "0 auto";

    const launchers = isAppleTv ? this._configuredLaunchers() : [];

    return html`
      <ha-card class=${classMap(themeClasses)} style=${styleMap(cardStyle)}>
        ${this._config.brushed ? brushedOverlay : nothing}
        <div class="remote-body">
          <div class="topbar">
            ${showName
              ? html`<span
                  class="device-name"
                  style=${styleMap({
                    fontSize: `calc(${(14 * (this._config.name_scale ?? 100)) / 100}px * var(--rc-scale))`,
                  })}
                  >${name}</span
                >`
              : html`<span></span>`}
            ${this._renderButton("power", { lit: isOn, cls: "power-button" })}
          </div>

          <div class="dpad" aria-label="Directional pad">
            ${this._renderButton("up", { cls: "dpad-up" })}
            ${this._renderButton("left", { cls: "dpad-left" })}
            ${this._renderButton("select", { cls: "dpad-select", text: "OK" })}
            ${this._renderButton("right", { cls: "dpad-right" })}
            ${this._renderButton("down", { cls: "dpad-down" })}
          </div>

          <div class="row nav">
            ${this._renderButton("back")} ${this._renderButton("home")}
            ${isKaleidescape ? this._renderButton("menu") : nothing}
          </div>

          <div class="row transport">
            ${isKaleidescape ? this._renderButton("skip_previous") : nothing}
            ${this._renderButton("rewind")}
            ${this._renderButton("play_pause", { lit: isPlaying })}
            ${this._renderButton("fast_forward")}
            ${isKaleidescape ? this._renderButton("skip_next") : nothing}
          </div>

          ${isAppleTv
            ? html`<div class="row volume">
                ${this._renderButton("volume_down")} ${this._renderButton("volume_up")}
              </div>`
            : nothing}
          ${launchers.length
            ? html`<div class="app-grid">
                ${launchers.map(
                  (source) => html`<button
                    type="button"
                    class="app-btn"
                    title=${source}
                    @click=${() => this._launch(source)}
                  >
                    ${source}
                  </button>`,
                )}
              </div>`
            : nothing}
          ${showStatus
            ? html`<div class="status">${this._statusLabel()}</div>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  /** Render a single remote button. Returns `nothing` if the button has no mapping. */
  private _renderButton(
    button: RemoteButton,
    opts: { lit?: boolean; cls?: string; text?: string } = {},
  ): TemplateResult | typeof nothing {
    if (!this._resolve(button)) return nothing;
    const classes: Record<string, boolean> = { rbtn: true, lit: !!opts.lit };
    if (opts.cls) classes[opts.cls] = true;
    return html`
      <button
        type="button"
        class=${classMap(classes)}
        aria-label=${BUTTON_LABELS[button]}
        title=${BUTTON_LABELS[button]}
        @click=${() => this._press(button)}
      >
        ${opts.text
          ? html`<span class="rbtn-text">${opts.text}</span>`
          : html`<ha-icon .icon=${BUTTON_ICONS[button]}></ha-icon>`}
      </button>
    `;
  }

  private _press = (button: RemoteButton): void => {
    const call = this._resolve(button);
    if (!call || !this.hass) return;
    this.hass.callService(call.domain, call.service, call.data);
    this._haptic();
  };

  private _launch(source: string): void {
    const mp = this._config?.media_player_entity;
    if (!this.hass || !mp || !source) return;
    this.hass.callService("media_player", "select_source", { entity_id: mp, source });
    this._haptic();
  }

  /** Resolve the concrete service call for a logical button, or undefined if unsupported. */
  private _resolve(button: RemoteButton): ServiceCall | undefined {
    const cfg = this._config;
    if (!cfg) return undefined;
    const remote = cfg.remote_entity;
    const mp = cfg.media_player_entity;

    if (button === "power") {
      const on = this._isOn();
      if (mp) {
        return { domain: "media_player", service: on ? "turn_off" : "turn_on", data: { entity_id: mp } };
      }
      return { domain: "remote", service: on ? "turn_off" : "turn_on", data: { entity_id: remote } };
    }

    if (button === "play_pause") {
      let command: string;
      if (mp) {
        command = this._isPaused() ? "play" : "pause";
      } else if (cfg.device_family === "apple-tv") {
        command = "play_pause";
      } else {
        command = "pause";
      }
      return { domain: "remote", service: "send_command", data: { entity_id: remote, command } };
    }

    const map = cfg.device_family === "apple-tv" ? APPLE_TV_COMMANDS : KALEIDESCAPE_COMMANDS;
    const command = map[button];
    if (!command) return undefined;
    return { domain: "remote", service: "send_command", data: { entity_id: remote, command } };
  }

  /** The entity whose state best represents the device (media_player when configured). */
  private _stateObj() {
    if (!this.hass || !this._config) return undefined;
    const mp = this._config.media_player_entity;
    return this.hass.states[mp ?? this._config.remote_entity];
  }

  private _isOn(): boolean {
    if (!this.hass || !this._config) return false;
    const mp = this._config.media_player_entity;
    if (mp) {
      const s = this.hass.states[mp]?.state;
      return s !== undefined && !OFF_STATES.includes(s);
    }
    return this.hass.states[this._config.remote_entity]?.state === "on";
  }

  private _mediaState(): string | undefined {
    if (!this.hass || !this._config?.media_player_entity) return undefined;
    return this.hass.states[this._config.media_player_entity]?.state;
  }

  private _isPlaying(): boolean {
    return this._mediaState() === "playing";
  }

  private _isPaused(): boolean {
    return this._mediaState() === "paused";
  }

  private _statusLabel(): string {
    const stateObj = this._stateObj();
    const state = stateObj?.state;
    if (!state || state === "unavailable" || state === "unknown") return "Unavailable";
    switch (state) {
      case "playing":
        return "Playing";
      case "paused":
        return "Paused";
      case "idle":
        return "Idle";
      case "buffering":
        return "Buffering";
      case "standby":
      case "off":
        return "Off";
      case "on":
        return "On";
      default:
        return state.charAt(0).toUpperCase() + state.slice(1).replace(/_/g, " ");
    }
  }

  /** Non-empty configured app-launch sources, in order. */
  private _configuredLaunchers(): string[] {
    const cfg = this._config;
    if (!cfg) return [];
    const out: string[] = [];
    for (let i = 1; i <= APP_LAUNCH_SLOTS; i++) {
      const value = cfg[`app_launch_${i}` as keyof RemoteCardConfig] as string | undefined;
      if (value && value.trim()) out.push(value);
    }
    return out;
  }

  private _haptic(): void {
    this.dispatchEvent(new CustomEvent("haptic", { bubbles: true, composed: true, detail: "light" }));
  }

  static styles = [
    tedStyleTheme,
    css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        --rc-scale: 1;
        --rc-btn: calc(44px * var(--rc-scale));
        --rc-gap: calc(10px * var(--rc-scale));

        position: relative;
        isolation: isolate;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: calc(16px * var(--rc-scale));
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        color: var(--ted-style-text);
      }
      .remote-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--rc-gap);
        width: 100%;
        max-width: calc(220px * var(--rc-scale));
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: var(--rc-gap);
        min-height: var(--rc-btn);
      }
      .device-name {
        font-weight: 500;
        color: var(--ted-style-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--rc-gap);
        width: 100%;
      }
      /* Shared button look. */
      .rbtn {
        width: var(--rc-btn);
        height: var(--rc-btn);
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        border-radius: 50%;
        border: 1px solid var(--ted-style-divider);
        background-color: var(--ted-style-surface-2);
        color: var(--ted-style-text);
        cursor: pointer;
        padding: 0;
        outline: none;
        transition: background-color 120ms ease, transform 80ms ease, box-shadow 120ms ease,
          color 120ms ease;
        -webkit-tap-highlight-color: transparent;
        --mdc-icon-size: calc(22px * var(--rc-scale));
      }
      .rbtn:hover {
        background-color: color-mix(in srgb, var(--ted-style-surface-2) 80%, var(--ted-style-text) 20%);
      }
      .rbtn:active {
        transform: scale(0.92);
      }
      .rbtn:focus-visible {
        box-shadow: 0 0 0 2px var(--ted-style-accent);
      }
      .rbtn.lit {
        color: var(--ted-style-accent);
        box-shadow: 0 0 0 1px var(--ted-style-accent),
          0 0 calc(10px * var(--rc-scale)) rgba(76, 194, 255, 0.35);
      }
      .rbtn-text {
        font-size: calc(13px * var(--rc-scale));
        font-weight: 600;
        line-height: 1;
      }
      .power-button {
        margin-left: auto;
      }
      .power-button.lit {
        color: var(--ted-style-success);
        box-shadow: 0 0 0 1px var(--ted-style-success),
          0 0 calc(10px * var(--rc-scale)) rgba(108, 203, 95, 0.35);
      }
      /* Directional pad arranged on a 3×3 grid inside a circular pad. */
      .dpad {
        display: grid;
        grid-template-columns: repeat(3, var(--rc-btn));
        grid-template-rows: repeat(3, var(--rc-btn));
        gap: calc(var(--rc-gap) * 0.4);
        place-items: center;
        padding: calc(var(--rc-gap) * 0.6);
        border-radius: var(--ted-style-pill);
        background: radial-gradient(
          circle at 50% 40%,
          color-mix(in srgb, var(--ted-style-surface-2) 88%, var(--ted-style-text) 12%),
          var(--ted-style-surface)
        );
        border: 1px solid var(--ted-style-divider);
      }
      .dpad .rbtn {
        background-color: transparent;
        border-color: transparent;
      }
      .dpad .rbtn:hover {
        background-color: rgba(127, 127, 127, 0.16);
      }
      .dpad-up {
        grid-column: 2;
        grid-row: 1;
      }
      .dpad-left {
        grid-column: 1;
        grid-row: 2;
      }
      .dpad-select {
        grid-column: 2;
        grid-row: 2;
        background-color: var(--ted-style-surface) !important;
        border: 1px solid var(--ted-style-divider) !important;
      }
      .dpad-right {
        grid-column: 3;
        grid-row: 2;
      }
      .dpad-down {
        grid-column: 2;
        grid-row: 3;
      }
      .app-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--rc-gap);
        width: 100%;
        margin-top: calc(var(--rc-gap) * 0.5);
      }
      .app-btn {
        min-height: calc(34px * var(--rc-scale));
        padding: 0 calc(10px * var(--rc-scale));
        border-radius: var(--ted-style-radius);
        border: 1px solid var(--ted-style-divider);
        background-color: var(--ted-style-surface-2);
        color: var(--ted-style-text);
        font-size: calc(12px * var(--rc-scale));
        cursor: pointer;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: background-color 120ms ease, transform 80ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .app-btn:hover {
        background-color: color-mix(in srgb, var(--ted-style-surface-2) 80%, var(--ted-style-text) 20%);
      }
      .app-btn:active {
        transform: scale(0.97);
      }
      .status {
        margin-top: calc(var(--rc-gap) * 0.25);
        font-size: calc(12px * var(--rc-scale));
        color: var(--ted-style-muted);
        text-align: center;
      }
      .not-found {
        padding: 12px;
        color: var(--error-color, #db4437);
        font-size: 13px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-remote-card": TedRemoteCard;
  }
}
