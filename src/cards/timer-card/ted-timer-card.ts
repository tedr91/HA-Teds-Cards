import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { HomeAssistant, LovelaceCard, LovelaceCardEditor } from "custom-card-helpers";

import { appearanceStyle } from "../../shared/appearance";
import { brushedOverlay, tedCardThemeClass, tedStyleTheme } from "../../shared/theme";
import { registerCustomCard } from "../../shared/register-card";
import {
  TIMERS_SENSOR,
  TIMER_CARD_DESCRIPTION,
  TIMER_CARD_EDITOR_TYPE,
  TIMER_CARD_NAME,
  TIMER_CARD_TYPE,
  TIMER_DOMAIN,
} from "./const";
import type { TimerCardConfig } from "./types";

interface ActiveTimer {
  id: string;
  name: string;
  ends: string;
}
interface RecentTimer {
  name: string;
  h: number;
  m: number;
  s: number;
}

/** Subset of Home Assistant's LovelaceGridOptions. */
interface GridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  min_columns?: number;
  min_rows?: number;
}

registerCustomCard({
  type: TIMER_CARD_TYPE,
  name: TIMER_CARD_NAME,
  description: TIMER_CARD_DESCRIPTION,
  preview: true,
  documentationURL: "https://github.com/tedr91/HA-Teds-Cards#timer-card",
});

@customElement(TIMER_CARD_TYPE)
export class TedTimerCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ted-timer-card-editor");
    return document.createElement(TIMER_CARD_EDITOR_TYPE) as LovelaceCardEditor;
  }

  public static getStubConfig(): Omit<TimerCardConfig, "type"> {
    return {};
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: TimerCardConfig;
  @state() private _name = "";
  @state() private _h = 0;
  @state() private _m = 5;
  @state() private _s = 0;
  /** Ticks once a second while any timer is counting down. */
  private _tick?: number;

  public setConfig(config: TimerCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): GridOptions {
    return { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopTick();
  }

  private _sensor(): string {
    return this._config?.entity ?? TIMERS_SENSOR;
  }

  private _attr<T>(key: string): T[] {
    return (this.hass?.states[this._sensor()]?.attributes[key] as T[]) ?? [];
  }

  private _call(service: string, data: Record<string, unknown>): void {
    this.hass?.callService(TIMER_DOMAIN, service, data);
  }

  private _start(): void {
    const total = this._h * 3600 + this._m * 60 + this._s;
    if (total <= 0) return;
    this._call("start_timer", {
      name: this._name || "Timer",
      hours: this._h,
      minutes: this._m,
      seconds: this._s,
    });
    this._name = "";
  }

  private _startTick(): void {
    if (this._tick === undefined) this._tick = window.setInterval(() => this.requestUpdate(), 1000);
  }
  private _stopTick(): void {
    if (this._tick !== undefined) {
      window.clearInterval(this._tick);
      this._tick = undefined;
    }
  }

  protected render(): TemplateResult | typeof nothing {
    const cfg = this._config;
    if (!cfg || !this.hass) return nothing;

    const theme = cfg.theme === "ted-style" ? "ted-style" : "ha";
    const shadow = cfg.shadow !== false;
    const brushed = cfg.brushed === true;
    const missing = !this.hass.states[this._sensor()];
    const active = this._attr<ActiveTimer>("active");
    const recent = this._attr<RecentTimer>("recent");
    const showAdd = cfg.show_add !== false;

    // Keep the countdown live only while a timer is running.
    if (active.length > 0) this._startTick();
    else this._stopTick();

    const cardClasses = {
      "ted-card": true,
      [tedCardThemeClass(theme)]: true,
      "no-shadow": !shadow,
    };
    const cardStyle = appearanceStyle({ transparency: cfg.transparency, blur: cfg.blur });

    return html`
      <ha-card class=${classMap(cardClasses)} style=${styleMap(cardStyle)}>
        ${brushed ? brushedOverlay : nothing}
        <div class="head">
          <ha-icon icon="mdi:timer-outline"></ha-icon>
          <span>${cfg.title ?? "Timers"}</span>
        </div>
        ${missing
          ? html`<div class="warn">Install the <b>Ted's Cards Backend</b> integration to use timers.</div>`
          : html`
              <div class="list">
                ${active.length === 0
                  ? html`<div class="empty">No timers running.</div>`
                  : active.map((t) => this._renderTimer(t))}
              </div>
              ${showAdd ? this._renderAdd() : nothing}
              ${recent.length ? this._renderRecent(recent) : nothing}
            `}
      </ha-card>
    `;
  }

  private _renderTimer(t: ActiveTimer): TemplateResult {
    const remaining = Math.max(0, Math.round((new Date(t.ends).getTime() - Date.now()) / 1000));
    return html`
      <div class="row">
        <span class="name">${t.name}</span>
        <span class="remaining">${this._fmtRemaining(remaining)}</span>
        <ha-icon-button
          class="cancel"
          .label=${`Cancel ${t.name}`}
          @click=${() => this._call("cancel_timer", { id: t.id })}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  private _renderAdd(): TemplateResult {
    return html`
      <div class="add">
        <ha-textfield
          class="grow"
          .value=${this._name}
          label="Name"
          @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this._start()}
        ></ha-textfield>
        <div class="hms">
          ${this._numField("H", this._h, 0, 23, (v) => (this._h = v))}
          ${this._numField("M", this._m, 0, 59, (v) => (this._m = v))}
          ${this._numField("S", this._s, 0, 59, (v) => (this._s = v))}
        </div>
        <ha-icon-button
          class="add-btn"
          .disabled=${this._h * 3600 + this._m * 60 + this._s <= 0}
          @click=${this._start}
          label="Start timer"
        >
          <ha-icon icon="mdi:play"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  private _numField(
    label: string,
    value: number,
    min: number,
    max: number,
    set: (v: number) => void,
  ): TemplateResult {
    return html`<label class="num">
      <input
        type="number"
        min=${min}
        max=${max}
        .value=${String(value)}
        @input=${(e: Event) => {
          const n = Number((e.target as HTMLInputElement).value);
          set(Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : 0);
        }}
      />
      <span>${label}</span>
    </label>`;
  }

  private _renderRecent(recent: RecentTimer[]): TemplateResult {
    return html`
      <div class="recent">
        ${recent.map(
          (r) => html`<button
            @click=${() =>
              this._call("start_timer", { name: r.name, hours: r.h, minutes: r.m, seconds: r.s })}
          >
            <ha-icon icon="mdi:history"></ha-icon>${r.name}
          </button>`,
        )}
      </div>
    `;
  }

  /** Seconds → "H:MM:SS" (drops the hours group when zero). */
  private _fmtRemaining(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  static styles = [
    tedStyleTheme,
    css`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        height: 100%;
        box-sizing: border-box;
        padding: 4px 0 10px;
        display: flex;
        flex-direction: column;
        color: var(--ted-style-text);
      }
      ha-card.no-shadow {
        box-shadow: none;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 1.05rem;
        padding: 12px 16px 8px;
      }
      .head ha-icon {
        color: var(--ted-style-accent);
        --mdc-icon-size: 22px;
      }
      .warn {
        padding: 8px 16px 16px;
        color: var(--ted-style-muted);
      }
      .empty {
        padding: 6px 16px 12px;
        color: var(--ted-style-muted);
        font-size: 0.9rem;
      }
      .list {
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 8px 8px 16px;
        border-top: 1px solid var(--ted-style-divider);
      }
      .name {
        flex: 1 1 auto;
        min-width: 0;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .remaining {
        font-size: 1.2rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--ted-style-accent);
      }
      .cancel {
        color: var(--ted-style-muted);
        flex: none;
      }
      .add {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 12px 2px;
        margin-top: 4px;
        border-top: 1px solid var(--ted-style-divider);
      }
      .add .grow {
        flex: 1 1 auto;
        min-width: 60px;
      }
      .hms {
        display: flex;
        gap: 6px;
        flex: none;
      }
      .num {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        font-size: 0.65rem;
        color: var(--ted-style-muted);
      }
      .num input {
        width: 44px;
        appearance: none;
        background: var(--ted-style-surface-2);
        color: var(--ted-style-text);
        border: 1px solid var(--ted-style-divider);
        border-radius: var(--ted-style-radius-sm);
        padding: 8px 4px;
        font: inherit;
        text-align: center;
      }
      ha-textfield {
        --mdc-theme-primary: var(--ted-style-accent);
        --mdc-text-field-fill-color: var(--ted-style-surface-2);
        --mdc-text-field-ink-color: var(--ted-style-text);
        --mdc-text-field-label-ink-color: var(--ted-style-muted);
      }
      .add-btn {
        color: var(--ted-style-accent);
        flex: none;
      }
      .recent {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 10px 16px 2px;
      }
      .recent button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid var(--ted-style-divider);
        border-radius: var(--ted-style-pill);
        padding: 5px 12px 5px 8px;
        background: transparent;
        color: var(--ted-style-text);
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .recent button:hover {
        background: var(--ted-style-surface-2);
      }
      .recent ha-icon {
        --mdc-icon-size: 16px;
        color: var(--ted-style-muted);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-timer-card": TedTimerCard;
  }
}
