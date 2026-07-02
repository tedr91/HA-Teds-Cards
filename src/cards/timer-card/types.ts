import type { LovelaceCardConfig } from "custom-card-helpers";
import type { TedStyleTheme } from "../../shared/types";

/** Config for the Timer card. Appearance mirrors the other Ted's Cards. */
export interface TimerCardConfig extends LovelaceCardConfig {
  type: string;
  /** Header text. Defaults to "Timers". */
  title?: string;
  /** Timers sensor entity. Defaults to `sensor.teds_timers`. */
  entity?: string;

  // Visual
  theme?: TedStyleTheme;
  /** Optional override for the card background (hex/rgb/hsl/var or a theme color name). */
  background?: string;
  transparency?: number;
  blur?: number;
  brushed?: boolean;
  shadow?: boolean;
  /** Show the header icon. Defaults to true. */
  show_icon?: boolean;
  /** Header icon size, as a percentage (10–300). Defaults to 100. */
  icon_scale?: number;
  /** Show the header title. Defaults to true. */
  show_name?: boolean;
  /** Header title size, as a percentage (10–300). Defaults to 100. */
  name_scale?: number;
  /** Overall card scale, as a percentage (50–200). Defaults to 100. */
  scale?: number;

  /** Show the "Current Running" list of active timers. Defaults to true. */
  show_active?: boolean;
  /** Show the "New Timer" start form. Defaults to true. */
  show_add?: boolean;
  /** Show the "Recent Timers" quick-restart chips. Defaults to true. */
  show_recent?: boolean;

  /** Order of the card sections. Any of "active", "add", "recent". */
  section_order?: string[];
}
