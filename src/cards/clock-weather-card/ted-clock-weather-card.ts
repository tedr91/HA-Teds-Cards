import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import {
  type HomeAssistant,
  type LovelaceCard,
  type LovelaceCardEditor,
} from "custom-card-helpers";

import { registerCustomCard } from "../../shared/register-card";
import { brushedOverlay, tedCardThemeClass, tedStyleTheme } from "../../shared/theme";
import {
  CLOCK_WEATHER_CARD_DESCRIPTION,
  CLOCK_WEATHER_CARD_EDITOR_TYPE,
  CLOCK_WEATHER_CARD_NAME,
  CLOCK_WEATHER_CARD_TYPE,
  DEFAULT_WEATHER_ICON,
  WEATHER_ICONS,
} from "./const";
import type { ClockWeatherCardConfig, TimeFormat, DateFormat } from "./types";

/** Reference string used to keep the clock font-size stable across minutes. */
const TICK_MS = 1000;
const CLOCK_WEIGHT = "600";
const DATE_WEIGHT = "500";
/** "12:22" should occupy this fraction of the card width at the default (Large) size. */
const CLOCK_WIDTH_FRACTION = 0.6;
/** "Saturday, June 22" should occupy this fraction of the card width at the default size. */
const DATE_WIDTH_FRACTION = 0.2625;
/** Temperature font-size as a fraction of the clock font-size. */
const TEMP_CLOCK_RATIO = 0.3;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Replace the longest matching token at each position (no re-replacement of output). */
function replaceTokens(fmt: string, map: Array<[string, string]>): string {
  const tokens = [...map].sort((a, b) => b[0].length - a[0].length);
  let out = "";
  let i = 0;
  while (i < fmt.length) {
    let matched = false;
    for (const [tok, val] of tokens) {
      if (fmt.startsWith(tok, i)) {
        out += val;
        i += tok.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += fmt[i];
      i++;
    }
  }
  return out;
}

function formatTimeTokens(d: Date, fmt: string): string {
  const H = d.getHours();
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ampm = H < 12 ? "AM" : "PM";
  return replaceTokens(fmt, [
    ["HH", pad(H)],
    ["H", String(H)],
    ["hh", pad(h12)],
    ["h", String(h12)],
    ["MM", pad(m)],
    ["mm", pad(m)],
    ["M", String(m)],
    ["m", String(m)],
    ["SS", pad(s)],
    ["ss", pad(s)],
    ["A", ampm],
    ["a", ampm.toLowerCase()],
  ]);
}

/** Derive 12-hour preference from HA's locale time_format ("12"/"am_pm"/"24"). */
function autoHour12(timeFormat: string | undefined): boolean | undefined {
  switch (timeFormat) {
    case "12":
    case "am_pm":
      return true;
    case "24":
      return false;
    default:
      return undefined; // let Intl decide from the locale
  }
}

function formatTime(
  d: Date,
  fmt: TimeFormat,
  custom: string,
  lang: string,
  localeTimeFormat: string | undefined,
): string {
  if (fmt === "custom") return formatTimeTokens(d, custom || "H:MM");
  let hour12: boolean | undefined;
  if (fmt === "12h") hour12 = true;
  else if (fmt === "24h") hour12 = false;
  else hour12 = autoHour12(localeTimeFormat);
  return new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", hour12 }).format(d);
}

function formatDateTokens(d: Date, fmt: string, lang: string): string {
  const weekdayLong = new Intl.DateTimeFormat(lang, { weekday: "long" }).format(d);
  const weekdayShort = new Intl.DateTimeFormat(lang, { weekday: "short" }).format(d);
  const monthLong = new Intl.DateTimeFormat(lang, { month: "long" }).format(d);
  const monthShort = new Intl.DateTimeFormat(lang, { month: "short" }).format(d);
  const day = d.getDate();
  const year = d.getFullYear();
  return replaceTokens(fmt, [
    ["dddd", weekdayLong],
    ["ddd", weekdayShort],
    ["MMMM", monthLong],
    ["MMM", monthShort],
    ["DD", pad(day)],
    ["D", String(day)],
    ["YYYY", String(year)],
    ["YY", String(year).slice(-2)],
  ]);
}

function formatDate(d: Date, fmt: DateFormat, custom: string, lang: string): string {
  if (fmt === "custom") return formatDateTokens(d, custom || "dddd, MMMM D", lang);
  return new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric" }).format(d);
}

/** Resolve a CSS color from a `ui_color` value (hex/rgb/hsl/var string or theme color name). */
function cssColor(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl") || value.startsWith("var")) {
    return value;
  }
  return `var(--${value}-color, ${value})`;
}

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
  type: CLOCK_WEATHER_CARD_TYPE,
  name: CLOCK_WEATHER_CARD_NAME,
  description: CLOCK_WEATHER_CARD_DESCRIPTION,
  preview: false,
  documentationURL: "https://github.com/tedr91/HA-Teds-Cards#clock-weather-card",
});

@customElement(CLOCK_WEATHER_CARD_TYPE)
export class TedClockWeatherCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./ted-clock-weather-card-editor");
    return document.createElement(CLOCK_WEATHER_CARD_EDITOR_TYPE) as LovelaceCardEditor;
  }

  public static getStubConfig(hass: HomeAssistant): Omit<ClockWeatherCardConfig, "type"> {
    const weather = Object.keys(hass.states).find((id) => id.startsWith("weather."));
    return weather ? { weather_entity: weather } : {};
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public layout?: string;
  @state() private _config?: ClockWeatherCardConfig;
  @state() private _now = new Date();

  private _timer?: number;
  private _ro?: ResizeObserver;
  private _canvas?: HTMLCanvasElement;
  private _lastWidth = -1;

  public setConfig(config: ClockWeatherCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (config.weather_entity && config.weather_entity.split(".")[0] !== "weather") {
      throw new Error("weather_entity must be a weather.* entity");
    }
    this._config = { ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): GridOptions {
    return {
      columns: "full",
      rows: 3,
      min_rows: 1,
    };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._now = new Date();
    this._timer = window.setInterval(() => {
      this._now = new Date();
    }, TICK_MS);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer !== undefined) window.clearInterval(this._timer);
    this._ro?.disconnect();
    this._ro = undefined;
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this._config) return false;
    if (changed.has("_config") || changed.has("_now") || changed.has("layout")) return true;
    if (!changed.has("hass")) return false;
    const weather = this._weatherEntityId();
    if (!weather) return false;
    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    if (!oldHass) return true;
    return oldHass.states[weather] !== this.hass?.states[weather];
  }

  protected firstUpdated(): void {
    const el = this.renderRoot.querySelector(".cwc") as HTMLElement | null;
    if (el && "ResizeObserver" in window) {
      this._ro = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width ?? 0;
        if (Math.abs(width - this._lastWidth) < 0.5) return; // ignore height-only changes
        this._lastWidth = width;
        this._recompute(width);
      });
      this._ro.observe(el);
    }
  }

  protected updated(): void {
    if (this._lastWidth > 0) this._recompute(this._lastWidth);
  }

  private _clockFactor(): number {
    switch (this._config?.clock_size ?? "large") {
      case "small":
        return 0.6;
      case "medium":
        return 0.8;
      case "custom":
        return (this._config?.clock_size_custom ?? 100) / 100;
      case "large":
      default:
        return 1;
    }
  }

  private _dateFactor(): number {
    return this._config?.date_size === "custom"
      ? (this._config?.date_size_custom ?? 100) / 100
      : 1;
  }

  private _weatherFactor(): number {
    return this._config?.weather_size === "custom"
      ? (this._config?.weather_size_custom ?? 100) / 100
      : 1;
  }

  private _lang(): string {
    return this.hass?.locale?.language || this.hass?.language || navigator.language || "en";
  }

  private _timeText(): string {
    return formatTime(
      this._now,
      this._config?.time_format ?? "auto",
      this._config?.time_format_custom ?? "H:MM",
      this._lang(),
      // hass.locale.time_format isn't in the published type; read it defensively.
      (this.hass?.locale as { time_format?: string } | undefined)?.time_format,
    );
  }

  private _dateText(): string {
    return formatDate(
      this._now,
      this._config?.date_format ?? "standard",
      this._config?.date_format_custom ?? "dddd, MMMM D",
      this._lang(),
    );
  }

  private _tempText(): string | undefined {
    const id = this._weatherEntityId();
    const stateObj = id ? this.hass?.states[id] : undefined;
    const temp = stateObj?.attributes?.temperature;
    if (temp == null || typeof temp !== "number") return undefined;
    const unit =
      (stateObj?.attributes?.temperature_unit as string | undefined) ??
      this.hass?.config?.unit_system?.temperature ??
      "°";
    return `${Math.round(temp)}${unit}`;
  }

  private _weatherIcon(): string {
    const id = this._weatherEntityId();
    const condition = id ? this.hass?.states[id]?.state : undefined;
    return (condition && WEATHER_ICONS[condition]) || DEFAULT_WEATHER_ICON;
  }

  /** Configured weather entity, or the first `weather.*` entity found. */
  private _weatherEntityId(): string | undefined {
    if (this._config?.weather_entity) return this._config.weather_entity;
    return this.hass ? Object.keys(this.hass.states).find((id) => id.startsWith("weather.")) : undefined;
  }

  /** Width (in px) of `text` per 1px of font-size, using the card's resolved font. */
  private _widthPer1px(text: string, weight: string, family: string): number {
    this._canvas ??= document.createElement("canvas");
    const ctx = this._canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = `${weight} 100px ${family}`;
    return ctx.measureText(text).width / 100;
  }

  /** Compute width-relative font sizes and publish them as CSS variables. */
  private _recompute(width: number): void {
    const el = this.renderRoot.querySelector(".cwc") as HTMLElement | null;
    if (!el || width <= 0) return;
    const family = getComputedStyle(el).fontFamily || "sans-serif";

    const clockW = this._widthPer1px(this._timeText(), CLOCK_WEIGHT, family);
    const clockPx = clockW > 0 ? (width * CLOCK_WIDTH_FRACTION * this._clockFactor()) / clockW : 0;

    const dateW = this._widthPer1px(this._dateText(), DATE_WEIGHT, family);
    const datePx = dateW > 0 ? (width * DATE_WIDTH_FRACTION * this._dateFactor()) / dateW : 0;

    const tempPx = clockPx * TEMP_CLOCK_RATIO * this._weatherFactor();

    el.style.setProperty("--cwc-clock-size", `${clockPx}px`);
    el.style.setProperty("--cwc-date-size", `${datePx}px`);
    el.style.setProperty("--cwc-temp-size", `${tempPx}px`);
    el.style.setProperty("--cwc-icon-size", `${tempPx}px`);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const theme = this._config.theme === "ha" ? "ha" : "ted-style";
    const forceTransparent = this._config.force_transparent !== false; // default true
    const brushed = this._config.brushed === true;

    const showClock = this._config.show_clock !== false;
    const showDate = this._config.show_date !== false;
    const showWeather = this._config.show_weather !== false;
    const showIcon = this._config.show_weather_icon === true; // default false
    const showTemp = this._config.show_current_temp !== false; // default true

    const cardClasses = {
      "ted-card": true,
      [tedCardThemeClass(theme)]: true,
      "is-transparent": forceTransparent,
    };

    const cardStyle: Record<string, string> = {};
    if (forceTransparent) {
      cardStyle.background = "transparent";
      cardStyle.border = "none";
      cardStyle.boxShadow = "none";
    } else {
      const bg = cssColor(this._config.background);
      if (bg) cardStyle.background = bg;
    }

    const timeText = this._timeText();
    const dateText = this._dateText();
    const temp = this._tempText();
    const icon = this._weatherIcon();
    const weatherVisible = showWeather && (showIcon || (showTemp && temp != null));

    return html`
      <ha-card class=${classMap(cardClasses)} style=${styleMap(cardStyle)}>
        ${brushed ? brushedOverlay : nothing}
        <div class="cwc">
          ${weatherVisible
            ? html`
                <div class="weather">
                  ${showIcon ? html`<ha-icon class="wicon" .icon=${icon}></ha-icon>` : nothing}
                  ${showTemp && temp != null ? html`<span class="temp">${temp}</span>` : nothing}
                </div>
              `
            : nothing}
          ${showClock ? html`<div class="clock">${timeText}</div>` : nothing}
          ${showDate ? html`<div class="date">${dateText}</div>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    tedStyleTheme,
    css`
      :host {
        display: block;
      }

      ha-card {
        height: 100%;
      }

      ha-card.is-transparent {
        --ha-card-border-color: transparent;
      }

      .cwc {
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        width: 100%;
        height: 100%;
        min-height: 56px;
        padding: 14px 18px;
        overflow: hidden;
        color: var(--ted-style-text);
      }

      .clock {
        font-size: var(--cwc-clock-size, 4rem);
        line-height: 1;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
        white-space: nowrap;
        text-align: left;
      }

      .date {
        position: absolute;
        right: 18px;
        bottom: 12px;
        font-size: var(--cwc-date-size, 1.1rem);
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
        color: var(--ted-style-muted);
      }

      .weather {
        position: absolute;
        right: 18px;
        top: 12px;
        display: flex;
        align-items: center;
        gap: 0.25em;
        line-height: 1;
      }

      .weather .temp {
        font-size: var(--cwc-temp-size, 1.2rem);
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
      }

      .weather .wicon {
        --mdc-icon-size: var(--cwc-icon-size, 1.4rem);
        width: var(--cwc-icon-size, 1.4rem);
        height: var(--cwc-icon-size, 1.4rem);
        color: var(--ted-style-text);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-clock-weather-card": TedClockWeatherCard;
  }
}
