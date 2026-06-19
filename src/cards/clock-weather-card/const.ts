import { NAMESPACE } from "../../shared/const";

export const CLOCK_WEATHER_CARD_TYPE = `${NAMESPACE}-clock-weather-card`;
export const CLOCK_WEATHER_CARD_EDITOR_TYPE = `${CLOCK_WEATHER_CARD_TYPE}-editor`;
export const CLOCK_WEATHER_CARD_NAME = "Ted Clock Weather Card";
export const CLOCK_WEATHER_CARD_DESCRIPTION =
  "A large clock with the date and current weather.";

/** mdi icon for each Home Assistant weather condition. */
export const WEATHER_ICONS: Record<string, string> = {
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  fog: "mdi:weather-fog",
  hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring",
  rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  exceptional: "mdi:weather-cloudy-alert",
};

export const DEFAULT_WEATHER_ICON = "mdi:weather-cloudy";
