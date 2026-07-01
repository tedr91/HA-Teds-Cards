import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import type { HomeAssistant, LovelaceCard, LovelaceCardEditor } from "custom-card-helpers";

import { appearanceStyle } from "../../shared/appearance";
import { brushedOverlay, tedCardThemeClass, tedStyleTheme } from "../../shared/theme";
import { registerCustomCard } from "../../shared/register-card";
import {
  ALARMS_SENSOR,
  ALARM_CARD_DESCRIPTION,
  ALARM_CARD_EDITOR_TYPE,
  ALARM_CARD_NAME,
  ALARM_CARD_TYPE,
  ALARM_DOMAIN,
} from "./const";
import type { AlarmCardConfig } from "./types";

interface Alarm {
  id: string;
  label: string;
  time: string;
  days: number[];
  description?: string;
  enabled: boolean;
}

/** Backend day indices (0–6) → short labels. Python weekday convention (Mon = 0). */
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Subset of Home Assistant's LovelaceGridOptions. */
interface GridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  min_columns?: number;
  min_rows?: number;
}

registerCustomCard({
  type: ALARM_CARD_TYPE,
  name: ALARM_CARD_NAME,
  description: ALARM_CARD_DESCRIPTION,
  preview: true,
  documentationURL: "https://github.com/tedr91/HA-Teds-Cards#alarm-card",
});

@customElement(ALARM_CARD_TYPE)
export class TedAlarmCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ted-alarm-card-editor");
    return document.createElement(ALARM_CARD_EDITOR_TYPE) as LovelaceCardEditor;
  }

  public static getStubConfig(): Omit<AlarmCardConfig, "type"> {
    return {};
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: AlarmCardConfig;
  @state() private _label = "";
  @state() private _time = "07:00";

  public setConfig(config: AlarmCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): GridOptions {
    return { columns: 6, rows: "auto", min_columns: 4, min_rows: 2 };
  }

  private _sensor(): string {
    return this._config?.entity ?? ALARMS_SENSOR;
  }

  private get _alarms(): Alarm[] {
    return (this.hass?.states[this._sensor()]?.attributes.alarms as Alarm[]) ?? [];
  }

  private _call(service: string, data: Record<string, unknown>): void {
    this.hass?.callService(ALARM_DOMAIN, service, data);
  }

  private _add(): void {
    if (!this._label) return;
    this._call("add_alarm", { label: this._label, time: this._time });
    this._label = "";
  }

  protected render(): TemplateResult | typeof nothing {
    const cfg = this._config;
    if (!cfg || !this.hass) return nothing;

    const theme = cfg.theme === "ted-style" ? "ted-style" : "ha";
    const shadow = cfg.shadow !== false;
    const brushed = cfg.brushed === true;
    const missing = !this.hass.states[this._sensor()];
    const alarms = this._alarms;
    const showAdd = cfg.show_add !== false;

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
          <ha-icon icon="mdi:alarm"></ha-icon>
          <span>${cfg.title ?? "Alarms"}</span>
        </div>
        ${missing
          ? html`<div class="warn">Install the <b>Ted's Cards Backend</b> integration to use alarms.</div>`
          : html`
              <div class="list">
                ${alarms.length === 0
                  ? html`<div class="empty">No alarms yet.</div>`
                  : alarms.map((a) => this._renderAlarm(a))}
              </div>
              ${showAdd ? this._renderAdd() : nothing}
            `}
      </ha-card>
    `;
  }

  private _renderAlarm(a: Alarm): TemplateResult {
    return html`
      <div class="row ${a.enabled ? "" : "off"}">
        <ha-switch
          .checked=${a.enabled}
          @change=${(e: Event) =>
            this._call("update_alarm", { id: a.id, enabled: (e.target as HTMLInputElement).checked })}
        ></ha-switch>
        <div class="info">
          <div class="label">${a.label}</div>
          ${a.description ? html`<div class="desc">${a.description}</div>` : nothing}
          ${Array.isArray(a.days) && a.days.length
            ? html`<div class="days">
                ${a.days.map((d) => html`<span>${DAY_LABELS[d] ?? d}</span>`)}
              </div>`
            : nothing}
        </div>
        <div class="time">${this._fmtTime(a.time)}</div>
        <ha-icon-button
          class="del"
          .label=${`Delete ${a.label}`}
          @click=${() => this._call("remove_alarm", { id: a.id })}
        >
          <ha-icon icon="mdi:delete-outline"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  private _renderAdd(): TemplateResult {
    return html`
      <div class="add">
        <ha-textfield
          class="grow"
          .value=${this._label}
          label="Label"
          @input=${(e: Event) => (this._label = (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this._add()}
        ></ha-textfield>
        <input
          class="time-input"
          type="time"
          .value=${this._time}
          @input=${(e: Event) => (this._time = (e.target as HTMLInputElement).value)}
        />
        <ha-icon-button class="add-btn" .disabled=${!this._label} @click=${this._add} label="Add alarm">
          <ha-icon icon="mdi:plus"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  /** Normalise a "HH:MM" or "HH:MM:SS" backend time to "HH:MM". */
  private _fmtTime(t: string): string {
    const parts = (t ?? "").split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
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
        padding: 8px 8px 8px 12px;
        border-top: 1px solid var(--ted-style-divider);
      }
      .row.off {
        opacity: 0.55;
      }
      .info {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .label {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .desc {
        font-size: 0.82rem;
        color: var(--ted-style-muted);
      }
      .days {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }
      .days span {
        font-size: 0.7rem;
        line-height: 1;
        padding: 3px 6px;
        border-radius: var(--ted-style-radius-sm);
        background: var(--ted-style-surface-2);
        color: var(--ted-style-muted);
      }
      .time {
        font-size: 1.15rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .del {
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
      }
      ha-textfield {
        --mdc-theme-primary: var(--ted-style-accent);
        --mdc-text-field-fill-color: var(--ted-style-surface-2);
        --mdc-text-field-ink-color: var(--ted-style-text);
        --mdc-text-field-label-ink-color: var(--ted-style-muted);
      }
      .time-input {
        appearance: none;
        background: var(--ted-style-surface-2);
        color: var(--ted-style-text);
        border: 1px solid var(--ted-style-divider);
        border-radius: var(--ted-style-radius-sm);
        padding: 9px 10px;
        font: inherit;
      }
      .add-btn {
        color: var(--ted-style-accent);
        flex: none;
      }
      ha-switch {
        --mdc-theme-secondary: var(--ted-style-accent);
        flex: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-alarm-card": TedAlarmCard;
  }
}
