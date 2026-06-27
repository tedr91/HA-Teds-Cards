import type { HomeAssistant } from "custom-card-helpers";

/** Which card a memory helper belongs to (drives the fixed name prefix + icon). */
export type MemoryHelperKind = "light" | "cover";

const HELPER_ICON: Record<MemoryHelperKind, string> = {
  light: "mdi:brightness-6",
  cover: "mdi:window-shutter",
};

/** Object id (the part after the dot) for the deterministic memory helper. */
function autoMemoryHelperObjectId(kind: MemoryHelperKind, entityId: string): string {
  const objectId = entityId.split(".")[1] ?? entityId;
  return `ted_${kind}_mem_${objectId}`;
}

/**
 * Deterministic `input_number` entity id used to remember a light's brightness
 * (or a cover's position). The fixed `ted_<kind>_mem_` prefix keeps the slug
 * predictable — so an existing helper can be detected and reused instead of
 * creating a duplicate — and unlikely to clash with helpers the user made for
 * other things.
 */
export function autoMemoryHelperEntityId(kind: MemoryHelperKind, entityId: string): string {
  return `input_number.${autoMemoryHelperObjectId(kind, entityId)}`;
}

/**
 * Resolve the auto memory helper for an entity, creating it if it doesn't exist
 * yet. Returns the helper's entity id, or `undefined` when creation fails (e.g.
 * the user lacks admin rights) so the caller can fall back to manual selection.
 */
export async function ensureMemoryHelper(
  hass: HomeAssistant,
  kind: MemoryHelperKind,
  entityId: string,
): Promise<string | undefined> {
  const predicted = autoMemoryHelperEntityId(kind, entityId);
  if (hass.states[predicted]) return predicted;
  try {
    const created = await hass.callWS<{ id: string }>({
      type: "input_number/create",
      name: autoMemoryHelperObjectId(kind, entityId),
      min: 1,
      max: 100,
      step: 1,
      initial: 100,
      mode: "slider",
      unit_of_measurement: "%",
      icon: HELPER_ICON[kind],
    });
    return `input_number.${created.id}`;
  } catch (err) {
    console.error("[ted-cards] Failed to create memory helper", err);
    return undefined;
  }
}
