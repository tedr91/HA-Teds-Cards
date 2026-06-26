/**
 * Helpers for embedding Home Assistant's built-in camera renderer.
 *
 * Cards in this collection reuse HA's internal `<hui-image>` element — the same
 * primitive the built-in picture-glance card uses — so a camera feed gets both
 * "auto" thumbnail polling and "live" streaming, plus fit-mode and error / spinner
 * handling, for free. That element ships with the Lovelace bundle and is only
 * registered on demand, so this module makes sure it is defined before a card
 * tries to render it.
 */

import type { LovelaceCard, LovelaceCardConfig } from "custom-card-helpers";

/** How the camera image updates: periodic thumbnail vs. continuous live stream. */
export type CameraView = "auto" | "live";

/** How the camera image fits its box (mirrors picture-glance's `fit_mode`). */
export type FitMode = "cover" | "contain" | "fill";

/**
 * The slim slice of HA's card helpers we use to force the camera element to load.
 * Structurally matches the room card's own declaration so the global `Window`
 * augmentation merges cleanly.
 */
interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
  }
}

/** Cached single-flight promise so the registration work only ever runs once. */
let huiImagePromise: Promise<boolean> | undefined;

/**
 * Ensure HA's internal `<hui-image>` custom element is registered.
 *
 * Resolves to `true` once the element is defined. The work is done once and
 * cached, so repeated calls are cheap. If the card helpers are unavailable the
 * promise resolves to `false` and callers should render a graceful placeholder.
 */
export function ensureHuiImage(): Promise<boolean> {
  if (customElements.get("hui-image")) return Promise.resolve(true);
  if (huiImagePromise) return huiImagePromise;

  huiImagePromise = (async () => {
    // Loading the card helpers pulls in the Lovelace bundle, which usually
    // registers `<hui-image>` as a side effect.
    const load = window.loadCardHelpers;
    if (!load) return false;
    try {
      const helpers = await load();
      if (!customElements.get("hui-image")) {
        // Belt-and-suspenders: building any built-in picture card imports the
        // `<hui-image>` module, registering the element.
        helpers.createCardElement({
          type: "picture-glance",
          entities: [],
          camera_image: "camera.unavailable",
        });
        // Never hang — fall through after a short grace period if needed.
        await Promise.race([
          customElements.whenDefined("hui-image"),
          new Promise((resolve) => window.setTimeout(resolve, 2000)),
        ]);
      }
      return Boolean(customElements.get("hui-image"));
    } catch {
      // Reset so a later call can retry after a transient failure.
      huiImagePromise = undefined;
      return false;
    }
  })();

  return huiImagePromise;
}
