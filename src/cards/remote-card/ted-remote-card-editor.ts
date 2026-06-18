import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardEditor, fireEvent } from "custom-card-helpers";

import {
  APP_LAUNCH_SLOTS,
  DEVICE_FAMILY_LABELS,
  REMOTE_CARD_EDITOR_TYPE,
  REMOTE_INTEGRATIONS,
} from "./const";
import type { DeviceFamily, RemoteCardConfig } from "./types";

// mdi:remote — App Launchers section
const APPS_ICON_PATH =
  "M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M4,18V6H20V18H4M6,8H8V10H6V8M6,11H8V13H6V11M6,14H8V16H6V14M9,14H15V16H9V14M16,14H18V16H16V14M9,11H15V13H9V11M16,11H18V13H16V11M9,8H18V10H9V8Z";

@customElement(REMOTE_CARD_EDITOR_TYPE)
export class TedRemoteCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: RemoteCardConfig;

  public setConfig(config: RemoteCardConfig): void {
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

  private _family(): DeviceFamily {
    return this._config?.device_family === "kaleidescape" ? "kaleidescape" : "apple-tv";
  }

  private _defaults(): Partial<RemoteCardConfig> {
    return {
      device_family: "apple-tv",
      theme: "ted-style",
      brushed: false,
      show_name: true,
      name_scale: 100,
      scale: 100,
    };
  }

  /** Source names exposed by the configured media_player (used for app-launch dropdowns). */
  private _sourceList(): string[] {
    const mp = this._config?.media_player_entity;
    const list = mp ? this.hass?.states[mp]?.attributes?.source_list : undefined;
    return Array.isArray(list) ? (list as string[]) : [];
  }

  private _appLaunchSelector() {
    const sources = this._sourceList();
    if (sources.length) {
      return {
        select: {
          mode: "dropdown" as const,
          custom_value: true,
          options: sources.map((s) => ({ value: s, label: s })),
        },
      };
    }
    return { text: {} };
  }

  private _schema() {
    const family = this._family();
    const integration = REMOTE_INTEGRATIONS[family];

    const sections: Array<Record<string, unknown>> = [
      {
        name: "device_family",
        required: true,
        selector: {
          select: {
            mode: "dropdown",
            options: (Object.keys(DEVICE_FAMILY_LABELS) as DeviceFamily[]).map((value) => ({
              value,
              label: DEVICE_FAMILY_LABELS[value],
            })),
          },
        },
      },
      {
        name: "remote_entity",
        required: true,
        selector: { entity: { domain: "remote", integration } },
      },
      {
        name: "media_player_entity",
        selector: { entity: { domain: "media_player", integration } },
      },
    ];

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
      { name: "brushed", selector: { boolean: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_name", selector: { boolean: {} } },
          {
            name: "name_scale",
            disabled: this._config?.show_name === false,
            selector: { number: { min: 10, max: 300, step: 5, mode: "box", unit_of_measurement: "%" } },
          },
        ],
      },
      {
        name: "scale",
        selector: { number: { min: 50, max: 200, step: 5, mode: "box", unit_of_measurement: "%" } },
      },
    ];

    sections.push({
      name: "",
      type: "expandable",
      title: "Appearance",
      iconPath:
        "M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z",
      flatten: true,
      schema: visual,
    });

    // App launchers — Apple TV only (Kaleidescape has no app launching).
    if (family === "apple-tv") {
      const selector = this._appLaunchSelector();
      const launcherSchema: Array<Record<string, unknown>> = [];
      for (let i = 1; i <= APP_LAUNCH_SLOTS; i++) {
        launcherSchema.push({ name: `app_launch_${i}`, selector });
      }
      sections.push({
        name: "",
        type: "expandable",
        title: "App Launchers",
        iconPath: APPS_ICON_PATH,
        flatten: true,
        schema: launcherSchema,
      });
    }

    return sections;
  }

  private _computeLabel = (schema: { name: string }): string => {
    if (schema.name.startsWith("app_launch_")) {
      return `App launch ${schema.name.slice("app_launch_".length)}`;
    }
    switch (schema.name) {
      case "device_family":
        return "Device family";
      case "remote_entity":
        return "Remote entity";
      case "media_player_entity":
        return "Media player entity (recommended)";
      case "theme":
        return "Visual styling";
      case "brushed":
        return "Brushed effect";
      case "show_name":
        return "Show name";
      case "name_scale":
        return "Name size";
      case "scale":
        return "Card scale";
      default:
        return schema.name;
    }
  };

  private _valueChanged = (ev: CustomEvent): void => {
    const previousFamily = this._config?.device_family;
    const config = { ...ev.detail.value } as RemoteCardConfig;
    const mutable = config as Partial<RemoteCardConfig>;

    // Switching families invalidates the entity selections (different integrations).
    if (previousFamily && config.device_family !== previousFamily) {
      delete mutable.remote_entity;
      delete mutable.media_player_entity;
      for (let i = 1; i <= APP_LAUNCH_SLOTS; i++) {
        delete mutable[`app_launch_${i}` as keyof RemoteCardConfig];
      }
    }

    // Kaleidescape has no app launchers — never persist them.
    if (config.device_family === "kaleidescape") {
      for (let i = 1; i <= APP_LAUNCH_SLOTS; i++) {
        delete mutable[`app_launch_${i}` as keyof RemoteCardConfig];
      }
    }

    // Strip values equal to their default so the saved YAML stays minimal.
    const defaults = this._defaults();
    for (const key of Object.keys(defaults) as Array<keyof RemoteCardConfig>) {
      if (config[key] === defaults[key]) {
        delete mutable[key];
      }
    }
    if (!config.media_player_entity) delete mutable.media_player_entity;

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
    "ted-remote-card-editor": TedRemoteCardEditor;
  }
}
