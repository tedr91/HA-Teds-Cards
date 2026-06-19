import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardEditor, fireEvent } from "custom-card-helpers";

import { CLOCK_WEATHER_CARD_EDITOR_TYPE } from "./const";
import type { ClockWeatherCardConfig } from "./types";

// mdi:palette — Visuals (General) section
const VISUAL_ICON_PATH =
  "M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z";
// mdi:clock-outline — Clock Settings section
const CLOCK_ICON_PATH =
  "M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12.5,7H11V13L15.75,15.85L16.5,14.62L12.5,12.25V7Z";
// mdi:calendar — Date Settings section
const DATE_ICON_PATH =
  "M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z";
// mdi:weather-partly-cloudy — Weather Settings section
const WEATHER_ICON_PATH =
  "M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.25 14.19,3.89 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.74C18.05,11.08 18.08,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.26C2.97,9.92 2.94,10.61 3.04,11.3Z";

@customElement(CLOCK_WEATHER_CARD_EDITOR_TYPE)
export class TedClockWeatherCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: ClockWeatherCardConfig;

  public setConfig(config: ClockWeatherCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;

    const data = { ...this._defaults(), ...this._config };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema()}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _defaults(): Partial<ClockWeatherCardConfig> {
    const weatherEntity = this.hass
      ? Object.keys(this.hass.states).find((id) => id.startsWith("weather."))
      : undefined;
    return {
      theme: "ted-style",
      force_transparent: true,
      brushed: false,
      show_clock: true,
      clock_size: "large",
      clock_size_custom: 100,
      clock_position: "left",
      time_format: "auto",
      time_format_custom: "H:MM",
      show_date: true,
      date_size: "standard",
      date_size_custom: 100,
      date_format: "standard",
      date_format_custom: "dddd, MMMM D",
      date_below_clock: false,
      date_align: "right",
      show_weather: true,
      weather_size: "standard",
      weather_size_custom: 100,
      show_weather_icon: false,
      show_current_temp: true,
      weather_above_clock: false,
      weather_align: "right",
      icon_style: "fancy",
      weather_entity: weatherEntity,
    };
  }

  private _scaleSelector() {
    return { number: { min: 10, max: 400, step: 5, mode: "box", unit_of_measurement: "%" } };
  }

  private _alignSelector() {
    return {
      select: {
        mode: "dropdown",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Centered" },
          { value: "right", label: "Right (default)" },
        ],
      },
    };
  }

  private _schema() {
    const cfg = this._config ?? ({} as ClockWeatherCardConfig);

    // Visuals (General)
    const visual: Array<Record<string, unknown>> = [
      {
        name: "theme",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "ted-style", label: "Ted's Style (default)" },
              { value: "ha", label: "Home Assistant theme" },
            ],
          },
        },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "force_transparent", selector: { boolean: {} } },
          {
            name: "background",
            disabled: cfg.force_transparent !== false,
            selector: { ui_color: {} },
          },
        ],
      },
      { name: "brushed", selector: { boolean: {} } },
    ];

    // Clock Settings
    const clock: Array<Record<string, unknown>> = [
      { name: "show_clock", selector: { boolean: {} } },
      {
        name: "clock_position",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "left", label: "Left (default)" },
              { value: "center", label: "Centered" },
              { value: "right", label: "Right" },
            ],
          },
        },
      },
      {
        name: "clock_size",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large (default)" },
              { value: "custom", label: "Custom" },
            ],
          },
        },
      },
    ];
    if (cfg.clock_size === "custom") {
      clock.push({ name: "clock_size_custom", selector: this._scaleSelector() });
    }
    clock.push({
      name: "time_format",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "auto", label: "Auto (default)" },
            { value: "12h", label: "12-hour" },
            { value: "24h", label: "24-hour" },
            { value: "custom", label: "Custom" },
          ],
        },
      },
    });
    if (cfg.time_format === "custom") {
      clock.push({ name: "time_format_custom", selector: { text: {} } });
    }

    // Date Settings
    const date: Array<Record<string, unknown>> = [
      { name: "show_date", selector: { boolean: {} } },
      {
        name: "date_size",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "standard", label: "Standard (default)" },
              { value: "custom", label: "Custom" },
            ],
          },
        },
      },
    ];
    if (cfg.date_size === "custom") {
      date.push({ name: "date_size_custom", selector: this._scaleSelector() });
    }
    date.push({
      name: "date_format",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "standard", label: "Standard (default)" },
            { value: "custom", label: "Custom" },
          ],
        },
      },
    });
    if (cfg.date_format === "custom") {
      date.push({ name: "date_format_custom", selector: { text: {} } });
    }
    date.push({ name: "date_below_clock", selector: { boolean: {} } });
    date.push({ name: "date_align", selector: this._alignSelector() });

    // Weather Settings
    const weather: Array<Record<string, unknown>> = [
      { name: "show_weather", selector: { boolean: {} } },
      { name: "weather_entity", selector: { entity: { domain: "weather" } } },
      { name: "weather_above_clock", selector: { boolean: {} } },
      { name: "weather_align", selector: this._alignSelector() },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_weather_icon", selector: { boolean: {} } },
          { name: "show_current_temp", selector: { boolean: {} } },
        ],
      },
      {
        name: "icon_style",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "basic", label: "Basic" },
              { value: "cool", label: "Cool" },
              { value: "fancy", label: "Fancy (default)" },
            ],
          },
        },
      },
      {
        name: "weather_size",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "standard", label: "Standard (default)" },
              { value: "custom", label: "Custom" },
            ],
          },
        },
      },
    ];
    if (cfg.weather_size === "custom") {
      weather.push({ name: "weather_size_custom", selector: this._scaleSelector() });
    }

    return [
      {
        name: "",
        type: "expandable",
        title: "Visuals (General)",
        iconPath: VISUAL_ICON_PATH,
        flatten: true,
        schema: visual,
      },
      {
        name: "",
        type: "expandable",
        title: "Clock Settings",
        iconPath: CLOCK_ICON_PATH,
        flatten: true,
        schema: clock,
      },
      {
        name: "",
        type: "expandable",
        title: "Date Settings",
        iconPath: DATE_ICON_PATH,
        flatten: true,
        schema: date,
      },
      {
        name: "",
        type: "expandable",
        title: "Weather Settings",
        iconPath: WEATHER_ICON_PATH,
        flatten: true,
        schema: weather,
      },
    ];
  }

  private _computeLabel = (schema: { name: string }): string => {
    switch (schema.name) {
      case "theme":
        return "Visual styling";
      case "force_transparent":
        return "Force transparent background";
      case "background":
        return "Background color override";
      case "brushed":
        return "Brushed effect";
      case "show_clock":
        return "Show clock";
      case "clock_size":
        return "Clock size";
      case "clock_size_custom":
        return "Clock size";
      case "clock_position":
        return "Position";
      case "time_format":
        return "Time format";
      case "time_format_custom":
        return "Time format (e.g. H:MM)";
      case "show_date":
        return "Show date";
      case "date_size":
        return "Date size";
      case "date_size_custom":
        return "Date size";
      case "date_format":
        return "Date format";
      case "date_format_custom":
        return "Date format (e.g. dddd, MMMM D)";
      case "date_below_clock":
        return "Position below clock";
      case "date_align":
        return "Alignment";
      case "show_weather":
        return "Show weather";
      case "weather_entity":
        return "Weather entity";
      case "weather_above_clock":
        return "Position above clock";
      case "weather_align":
        return "Alignment";
      case "icon_style":
        return "Icon style";
      case "show_weather_icon":
        return "Show weather icon";
      case "show_current_temp":
        return "Show current temp";
      case "weather_size":
        return "Weather size";
      case "weather_size_custom":
        return "Weather size";
      default:
        return schema.name;
    }
  };

  private _valueChanged = (ev: CustomEvent): void => {
    const config = { ...ev.detail.value } as ClockWeatherCardConfig;
    const defaults = this._defaults();
    // Strip values equal to their default so the saved YAML stays minimal.
    for (const key of Object.keys(defaults) as Array<keyof ClockWeatherCardConfig>) {
      if (config[key] === defaults[key]) {
        delete config[key];
      }
    }
    // Drop conditional fields that no longer apply.
    if (config.clock_size !== "custom") delete config.clock_size_custom;
    if (config.time_format !== "custom") delete config.time_format_custom;
    if (config.date_size !== "custom") delete config.date_size_custom;
    if (config.date_format !== "custom") delete config.date_format_custom;
    if (config.weather_size !== "custom") delete config.weather_size_custom;
    // The background override only applies when the card isn't forced transparent.
    if (config.force_transparent !== false) delete config.background;
    if (!config.background) delete config.background;
    if (!config.weather_entity) delete config.weather_entity;
    fireEvent(this, "config-changed", { config });
  };

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ted-clock-weather-card-editor": TedClockWeatherCardEditor;
  }
}
