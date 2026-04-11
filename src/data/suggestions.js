/**
 * Shared place suggestions — single source of truth used by SearchBar and Sidebar.
 * Centralising here eliminates the previous duplication across three files.
 */

/**
 * Pre-seeded venue suggestions shown in the search dropdown.
 * @type {Array<{ name: string, type: string, location: string }>}
 */
export const PLACE_SUGGESTIONS = [
  { name: "Central Perk Cafe", type: "cafe", location: "5th Avenue, Midtown" },
  { name: "Riverside Library", type: "library", location: "Riverside Blvd" },
  { name: "Iron Temple Gym", type: "gym", location: "Market Street" },
  { name: "Sunset Bistro", type: "restaurant", location: "Ocean Drive" },
  { name: "Maple Mall", type: "mall", location: "Oak District" },
  { name: "Aurora Museum", type: "museum", location: "Old Town" },
  { name: "Greenway Park", type: "park", location: "Lakeview" },
  { name: "The Study Nook", type: "library", location: "West End" },
];

/**
 * Human-readable display labels for each venue type.
 * @type {Record<string, string>}
 */
export const TYPE_LABELS = {
  restaurant: "Restaurant",
  gym: "Gym",
  library: "Library",
  cafe: "Cafe",
  mall: "Mall",
  park: "Park",
  museum: "Museum",
};

/**
 * Infer the most likely venue type from a search query string.
 * Falls back to "restaurant" when no keyword is recognised.
 *
 * @param {string} query - The user's raw search text.
 * @returns {string} A venue type key matching PLACE_TYPE_CONFIG.
 */
export function inferTypeFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes("gym") || q.includes("fitness")) return "gym";
  if (q.includes("library") || q.includes("book")) return "library";
  if (q.includes("cafe") || q.includes("coffee")) return "cafe";
  if (q.includes("mall") || q.includes("plaza")) return "mall";
  if (q.includes("park") || q.includes("garden")) return "park";
  if (q.includes("museum") || q.includes("gallery")) return "museum";
  if (q.includes("restaurant") || q.includes("diner") || q.includes("eatery")) return "restaurant";
  return "restaurant";
}
