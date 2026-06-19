// Animated weather icons ("Meteocons" fill set) by Bas Milius — MIT licensed.
// https://github.com/basmilius/weather-icons  (see ./icons/LICENSE)
// Condition → icon mapping mirrors pkissling/clock-weather-card.
import clearDay from "./icons/clear-day.svg";
import clearNight from "./icons/clear-night.svg";
import partlyCloudyDay from "./icons/partly-cloudy-day.svg";
import partlyCloudyDayRain from "./icons/partly-cloudy-day-rain.svg";
import cloudy from "./icons/cloudy.svg";
import fogDay from "./icons/fog-day.svg";
import hail from "./icons/hail.svg";
import thunderstormsDay from "./icons/thunderstorms-day.svg";
import thunderstormsDayRain from "./icons/thunderstorms-day-rain.svg";
import rain from "./icons/rain.svg";
import snow from "./icons/snow.svg";
import sleet from "./icons/sleet.svg";
import windsock from "./icons/windsock.svg";
import hurricane from "./icons/hurricane.svg";

/** Home Assistant weather condition → animated fill SVG (markup string). */
const FANCY_WEATHER_ICONS: Record<string, string> = {
  sunny: clearDay,
  "clear-night": clearNight,
  partlycloudy: partlyCloudyDay,
  rainy: partlyCloudyDayRain,
  cloudy,
  fog: fogDay,
  hail,
  lightning: thunderstormsDay,
  "lightning-rainy": thunderstormsDayRain,
  pouring: rain,
  snowy: snow,
  "snowy-rainy": sleet,
  windy: windsock,
  "windy-variant": windsock,
  exceptional: hurricane,
};

/** Resolve the animated icon markup for a condition, falling back to cloudy. */
export function fancyWeatherIcon(condition: string | undefined): string {
  return (condition && FANCY_WEATHER_ICONS[condition]) || cloudy;
}
