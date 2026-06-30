import type { HomeAssistant } from "custom-card-helpers";

/**
 * The entity id of the current device's View Assist sensor, as stored by View Assist
 * in `localStorage` under `view_assist_sensor`. Returns `undefined` on a normal browser
 * (no View Assist), so callers can fall back gracefully. The read is wrapped so a blocked
 * `localStorage` never throws.
 */
export function viewAssistSensor(): string | undefined {
  try {
    return localStorage.getItem("view_assist_sensor") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Navigate using the View Assist integration's `view_assist.navigate` service so
 * the destination honours the current device's configured screens.
 *
 * The current device is resolved from the `view_assist_sensor` entity id that
 * View Assist stores in `localStorage`. On a real View Assist device the
 * integration is asked to navigate (which also drives browser_mod / remote
 * assist display targets); on a normal browser (no `view_assist_sensor`) the
 * card falls back to a standard client-side dashboard navigation.
 *
 * `view` is the logical name `home` — resolved by the integration to the
 * device's configured Home screen — or a view slug such as `music`, navigated
 * relative to the device's configured dashboard base.
 *
 * This only ever runs in response to a user action, never at load/render, so it
 * has no effect for users who don't use View Assist.
 */
export function viewAssistNavigate(hass: HomeAssistant | undefined, view: string): void {
  const sensor = viewAssistSensor();

  const state = sensor && hass ? hass.states[sensor] : undefined;
  if (hass && sensor && state) {
    const dashboard =
      (typeof state.attributes.dashboard === "string" && state.attributes.dashboard) ||
      "/view-assist";
    const path = view === "home" ? "home" : `${dashboard}/${view}`;
    hass.callService("view_assist", "navigate", { device: sensor, path });
    return;
  }

  // Not a View Assist device — fall back to a normal dashboard navigation.
  const target = view === "home" ? "/view-assist/clock" : `/view-assist/${view}`;
  window.history.pushState(null, "", target);
  window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
}

/**
 * Toggle View Assist "hold" mode on the current device, which pauses the
 * auto-revert timeout so the screen stays on the current view. Resolves the
 * device from the `view_assist_sensor` localStorage key and flips its `mode`
 * attribute between "hold" and "normal" via `view_assist.set_state`.
 *
 * No-op when not on a View Assist device. Only ever called from a user action.
 */
export function viewAssistToggleHold(hass: HomeAssistant | undefined): void {
  const sensor = viewAssistSensor();
  if (!hass || !sensor) return;
  const mode = String(hass.states[sensor]?.attributes.mode ?? "");
  hass.callService("view_assist", "set_state", {
    entity_id: sensor,
    mode: mode === "hold" ? "normal" : "hold",
  });
}
