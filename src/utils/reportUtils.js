/**
 * Place import utilities.
 * Extracted from App.jsx to keep the main component clean and to make this
 * logic independently testable.
 */

import { inferTypeFromQuery } from "../data/suggestions";

/**
 * Configuration for each importable venue type.
 * Maps a type key to its display metadata and default capacity used when
 * building an imported place object.
 *
 * @type {Record<string, { label: string, category: string, icon: string, peakHours: number[][], baseCapacity: number }>}
 */
export const PLACE_TYPE_CONFIG = {
  restaurant: {
    label: "Restaurant",
    category: "food",
    icon: "🍽️",
    peakHours: [[11, 14]],
    baseCapacity: 120,
  },
  gym: {
    label: "Gym",
    category: "fitness",
    icon: "🏋️",
    peakHours: [[17, 21]],
    baseCapacity: 90,
  },
  library: {
    label: "Library",
    category: "study",
    icon: "📚",
    peakHours: [[13, 17]],
    baseCapacity: 160,
  },
  cafe: {
    label: "Cafe",
    category: "food",
    icon: "☕",
    peakHours: [[8, 10], [15, 17]],
    baseCapacity: 70,
  },
  mall: {
    label: "Mall",
    category: "shopping",
    icon: "🏬",
    peakHours: [[12, 15], [17, 21]],
    baseCapacity: 700,
  },
  park: {
    label: "Park",
    category: "all",
    icon: "🌳",
    peakHours: [[7, 10], [16, 19]],
    baseCapacity: 300,
  },
  museum: {
    label: "Museum",
    category: "all",
    icon: "🏛️",
    peakHours: [[11, 14]],
    baseCapacity: 220,
  },
};

/**
 * Build a fully-formed place object from a user-provided import draft.
 * Infers the venue type from the name when not explicitly supplied.
 * lat/lng are optional — passed through when the import originates from
 * the map (click or Nominatim search) so the place appears as a marker.
 *
 * @param {{ name: string, type?: string, location?: string, lat?: number, lng?: number }} placeDraft
 * @returns {object} A place object compatible with the CrowdSense data model.
 */
export function buildImportedPlace({ name, type, location, lat, lng }) {
  const safeName = name.trim();
  const resolvedType = type || inferTypeFromQuery(safeName);
  const config = PLACE_TYPE_CONFIG[resolvedType] || PLACE_TYPE_CONFIG.restaurant;

  // Build a URL-friendly slug from the place name for use in the id.
  const slug = safeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Add a small random variance so capacity feels realistic, not identical.
  const capacityVariance = Math.floor(Math.random() * 60);

  return {
    id: `import-${slug || "place"}-${Date.now()}`,
    name: safeName,
    icon: config.icon,
    category: config.category,
    description: `Imported ${config.label} prediction`,
    location: location || "User imported location",
    capacity: config.baseCapacity + capacityVariance,
    peakHours: config.peakHours,
    type: resolvedType,
    source: "import",
    ...(lat != null && lng != null ? { lat, lng } : {}),
  };
}
