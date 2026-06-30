import type { ActionConfig, HomeAssistant } from "custom-card-helpers";

import { defaultNavButton } from "./const";
import type { NavButtonConfig, NavItem } from "./types";

/** Known View Assist status-icon template keywords that map to a dashboard view.
 *  Mirrors dinki's dashboard.yaml button-card templates (icons are MDI, like VA). */
const NAV_KEYWORDS: Record<string, { icon: string; view: string }> = {
  home: { icon: "mdi:home", view: "home" },
  weather: { icon: "mdi:weather-sunny", view: "weather" },
  camera: { icon: "mdi:cctv", view: "camera" },
  music: { icon: "mdi:music", view: "music" },
};

/** Prefix a bare MDI icon name (View Assist stores icons without the `mdi:` prefix). */
function mdi(name: string): string {
  const trimmed = name.trim();
  return trimmed.includes(":") ? trimmed : `mdi:${trimmed}`;
}

/** The last path segment of a View Assist view target (`/view-assist/music` → `music`). */
function lastSegment(target: string): string {
  if (!target.includes("/")) return target;
  const parts = target.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : target;
}

/** A blank navbar icon button (canonical nav styling) ready for an icon + action. */
function iconButton(): NavButtonConfig {
  const button = defaultNavButton();
  delete button.tap_action;
  return button;
}

/** Pick the MDI icon for an `entity:` item (`icon_on[,icon_off]`), swapping to the off
 *  icon when the entity is off. */
function entityIcon(iconPart: string, entityId: string, hass?: HomeAssistant): string {
  const options = (iconPart || "help-circle").split(",");
  let name = options[0];
  if (options.length > 1 && hass?.states[entityId]?.state === "off") name = options[1];
  return mdi(name);
}

/** Map a View Assist size value ("6vw"/"7vw"/"8vw") to a navbar bar thickness (px).
 *  View Assist's own responsive vw rendering is deliberately NOT used — only the
 *  small/medium/large choice is honoured; everything inside the bar auto-scales from
 *  the resulting thickness. */
export function vaSizeToThickness(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;
  const value = parseInt(raw, 10);
  if (value === 6) return 35;
  if (value === 7) return 42;
  if (value === 8) return 50;
  return undefined;
}

/** Parse one View Assist status-icon / menu string into a navbar button config, or
 *  `undefined` to skip it (the `menu` toggle and unsupported keywords). Grammar matches
 *  dinki's dashboard.yaml renderer: a bare keyword names a template; a `type:target|icon`
 *  string is a dynamic view / entity / service item. */
export function parseVaItem(raw: string, hass?: HomeAssistant): NavButtonConfig | undefined {
  const value = (raw ?? "").trim();
  if (!value || value === "menu") return undefined;

  if (value.includes(":")) {
    const [typeTarget, iconPart = ""] = value.split("|");
    const sep = typeTarget.indexOf(":");
    const type = typeTarget.slice(0, sep);
    const target = typeTarget.slice(sep + 1);
    if (!target) return undefined;

    if (type === "view") {
      return {
        ...iconButton(),
        icon: mdi(iconPart || "view-dashboard"),
        tap_action: { action: "view-assist-navigate", view: lastSegment(target) } as unknown as ActionConfig,
      };
    }
    if (type === "entity") {
      return {
        ...iconButton(),
        entity: target,
        icon: entityIcon(iconPart, target, hass),
        tap_action: { action: "toggle" },
        hold_action: { action: "more-info", entity: target },
      };
    }
    if (type === "service") {
      return {
        ...iconButton(),
        icon: mdi(iconPart || "cog"),
        tap_action: { action: "call-service", service: target, service_data: {} },
      };
    }
    return undefined;
  }

  const keyword = NAV_KEYWORDS[value];
  if (keyword) {
    return {
      ...iconButton(),
      icon: keyword.icon,
      tap_action: { action: "view-assist-navigate", view: keyword.view } as unknown as ActionConfig,
    };
  }
  if (value === "hold") {
    return {
      ...iconButton(),
      icon: "mdi:hand-back-left",
      tap_action: { action: "view-assist-hold" } as unknown as ActionConfig,
    };
  }
  // Unsupported keyword (mic / mediaplayer / dnd / cycle / wake / a custom template).
  return undefined;
}

/** A stable de-dup key for a nav item, derived from its tap action, so a sourced item
 *  that duplicates a curated button (same view / entity / service) can be dropped. */
export function navItemKey(item: NavItem): string | undefined {
  const button = item as NavButtonConfig;
  const action = button.tap_action as unknown as Record<string, unknown> | undefined;
  if (!action) return undefined;
  if (action.action === "view-assist-navigate" && typeof action.view === "string") return `view:${action.view}`;
  if (action.action === "navigate" && typeof action.navigation_path === "string") return `nav:${action.navigation_path}`;
  if (action.action === "toggle" || action.action === "more-info") {
    const entity = (typeof action.entity === "string" ? action.entity : undefined) ?? button.entity;
    return entity ? `entity:${entity}` : undefined;
  }
  if (action.action === "call-service" && typeof action.service === "string") return `service:${action.service}`;
  return undefined;
}
