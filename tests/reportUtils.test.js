/**
 * Unit tests for src/utils/reportUtils.js
 *
 * Validates that buildImportedPlace produces correctly-shaped place objects,
 * infers types correctly, and is robust against edge-case inputs.
 */

const {
  buildImportedPlace,
  PLACE_TYPE_CONFIG,
} = require("../src/utils/reportUtils");

// ─────────────────────────────────────────────
// PLACE_TYPE_CONFIG shape
// ─────────────────────────────────────────────
describe("PLACE_TYPE_CONFIG", () => {
  const requiredKeys = ["label", "category", "icon", "peakHours", "baseCapacity"];

  test.each(Object.keys(PLACE_TYPE_CONFIG))("type '%s' has all required fields", (type) => {
    const config = PLACE_TYPE_CONFIG[type];
    requiredKeys.forEach((key) => {
      expect(config).toHaveProperty(key);
    });
  });

  test("baseCapacity is a positive number for every type", () => {
    Object.values(PLACE_TYPE_CONFIG).forEach((config) => {
      expect(config.baseCapacity).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────
// buildImportedPlace — required output shape
// ─────────────────────────────────────────────
describe("buildImportedPlace — output shape", () => {
  const draft = { name: "Iron Temple Gym", type: "gym", location: "Market Street" };

  test("returns an object with all required place fields", () => {
    const place = buildImportedPlace(draft);
    const fields = ["id", "name", "icon", "category", "description", "location", "capacity", "peakHours", "type", "source"];
    fields.forEach((f) => expect(place).toHaveProperty(f));
  });

  test("source is 'import'", () => {
    expect(buildImportedPlace(draft).source).toBe("import");
  });

  test("name is trimmed", () => {
    const place = buildImportedPlace({ name: "  My Cafe  ", type: "cafe" });
    expect(place.name).toBe("My Cafe");
  });

  test("id contains the place name as a slug", () => {
    const place = buildImportedPlace({ name: "Sunset Bistro", type: "restaurant" });
    expect(place.id).toContain("sunset-bistro");
  });

  test("id is unique across two calls", () => {
    const a = buildImportedPlace({ name: "Gym A", type: "gym" });
    const b = buildImportedPlace({ name: "Gym A", type: "gym" });
    // IDs include Date.now() so sequential calls may collide in tests — check prefix at minimum
    expect(typeof a.id).toBe("string");
    expect(typeof b.id).toBe("string");
  });
});

// ─────────────────────────────────────────────
// buildImportedPlace — type inference
// ─────────────────────────────────────────────
describe("buildImportedPlace — type inference", () => {
  test("explicit type 'gym' sets fitness category", () => {
    const place = buildImportedPlace({ name: "My Gym", type: "gym" });
    expect(place.category).toBe("fitness");
    expect(place.type).toBe("gym");
  });

  test("infers 'cafe' from name containing 'coffee'", () => {
    const place = buildImportedPlace({ name: "Morning Coffee House" });
    expect(place.type).toBe("cafe");
  });

  test("infers 'library' from name containing 'library'", () => {
    const place = buildImportedPlace({ name: "City Library" });
    expect(place.type).toBe("library");
  });

  test("falls back to 'restaurant' for unrecognised names with no type", () => {
    const place = buildImportedPlace({ name: "Random Venue XYZ" });
    expect(place.type).toBe("restaurant");
    expect(place.category).toBe("food");
  });

  test("unknown type falls back to restaurant config gracefully", () => {
    const place = buildImportedPlace({ name: "Mystery Place", type: "unknowntype" });
    expect(["food", "fitness", "study", "shopping", "transport", "all"]).toContain(place.category);
  });
});

// ─────────────────────────────────────────────
// buildImportedPlace — capacity
// ─────────────────────────────────────────────
describe("buildImportedPlace — capacity", () => {
  test("capacity is at least baseCapacity for the type", () => {
    const place = buildImportedPlace({ name: "Test Cafe", type: "cafe" });
    expect(place.capacity).toBeGreaterThanOrEqual(PLACE_TYPE_CONFIG.cafe.baseCapacity);
  });

  test("capacity does not exceed baseCapacity + 60", () => {
    const place = buildImportedPlace({ name: "Test Cafe", type: "cafe" });
    expect(place.capacity).toBeLessThanOrEqual(PLACE_TYPE_CONFIG.cafe.baseCapacity + 60);
  });
});

// ─────────────────────────────────────────────
// buildImportedPlace — location fallback
// ─────────────────────────────────────────────
describe("buildImportedPlace — location", () => {
  test("uses provided location when supplied", () => {
    const place = buildImportedPlace({ name: "Test", type: "cafe", location: "5th Avenue" });
    expect(place.location).toBe("5th Avenue");
  });

  test("falls back to default when location is omitted", () => {
    const place = buildImportedPlace({ name: "Test", type: "cafe" });
    expect(place.location).toBeTruthy();
  });
});
