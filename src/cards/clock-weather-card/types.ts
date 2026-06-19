import type { LovelaceCardConfig } from "custom-card-helpers";
import type { TedStyleTheme } from "../../shared/types";

export type ClockSize = "small" | "medium" | "large" | "custom";
export type ClockPosition = "left" | "center" | "right";
export type Align = "left" | "center" | "right";
export type IconStyle = "basic" | "cool" | "fancy";
export type TimeFormat = "auto" | "12h" | "24h" | "custom";
export type DateSize = "standard" | "custom";
export type DateFormat = "standard" | "custom";
export type WeatherSize = "standard" | "custom";

export interface ClockWeatherCardConfig extends LovelaceCardConfig {
  type: string;

  // Visuals (General)
  theme?: TedStyleTheme;
  force_transparent?: boolean;
  background?: string;
  brushed?: boolean;

  // Clock
  show_clock?: boolean;
  clock_size?: ClockSize;
  clock_size_custom?: number;
  clock_position?: ClockPosition;
  time_format?: TimeFormat;
  time_format_custom?: string;

  // Date
  show_date?: boolean;
  date_size?: DateSize;
  date_size_custom?: number;
  date_format?: DateFormat;
  date_format_custom?: string;
  date_below_clock?: boolean;
  date_align?: Align;

  // Weather
  show_weather?: boolean;
  weather_entity?: string;
  weather_size?: WeatherSize;
  weather_size_custom?: number;
  show_weather_icon?: boolean;
  show_current_temp?: boolean;
  weather_above_clock?: boolean;
  weather_align?: Align;
  icon_style?: IconStyle;
  /** @deprecated replaced by `icon_style`. */
  fancy_icons?: boolean;
}
