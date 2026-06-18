import { NAMESPACE } from "../../shared/const";
import type { DeviceFamily, RemoteButton } from "./types";

export const REMOTE_CARD_TYPE = `${NAMESPACE}-remote-card`;
export const REMOTE_CARD_EDITOR_TYPE = `${REMOTE_CARD_TYPE}-editor`;
export const REMOTE_CARD_NAME = "Ted Remote Card";
export const REMOTE_CARD_DESCRIPTION = "Remote control card for Apple TV and Kaleidescape devices.";

/** Number of quick-launch app slots exposed in the editor (Apple TV only). */
export const APP_LAUNCH_SLOTS = 6;

/** HA integration (entity platform) backing each device family — used to filter entity pickers. */
export const REMOTE_INTEGRATIONS: Record<DeviceFamily, string> = {
  "apple-tv": "apple_tv",
  kaleidescape: "kaleidescape_strato",
};

export const DEVICE_FAMILY_LABELS: Record<DeviceFamily, string> = {
  "apple-tv": "Apple TV",
  kaleidescape: "Kaleidescape",
};

/**
 * Destinations the Kaleidescape Home button can navigate to. Values are
 * `kaleidescape_strato` remote aliases (`home` → HOME, `movie_covers` →
 * GO_MOVIE_COVERS, etc.).
 */
export const KALEIDESCAPE_HOME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "home", label: "Home (default)" },
  { value: "movie_covers", label: "Movie covers" },
  { value: "movie_list", label: "Movie list" },
  { value: "movie_collections", label: "Movie collections" },
  { value: "system_status", label: "System status" },
];

/**
 * Apple TV — logical button → `remote.send_command` command (pyatv RemoteControl /
 * power / audio commands exposed by the HA `apple_tv` integration). `power` and
 * `play_pause` are handled specially (state-dependent) in the card.
 */
export const APPLE_TV_COMMANDS: Partial<Record<RemoteButton, string>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  select: "select",
  back: "menu",
  home: "top_menu",
  rewind: "skip_backward",
  fast_forward: "skip_forward",
  volume_up: "volume_up",
  volume_down: "volume_down",
};

/**
 * Kaleidescape — logical button → `remote.send_command` alias accepted by the
 * custom `kaleidescape_strato` integration (lowercase HA-style aliases). `power`
 * and `play_pause` are handled specially (state-dependent) in the card.
 */
export const KALEIDESCAPE_COMMANDS: Partial<Record<RemoteButton, string>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  select: "select",
  back: "back",
  home: "home",
  menu: "menu",
  rewind: "rewind",
  fast_forward: "fast_forward",
  skip_previous: "previous",
  skip_next: "next",
};
