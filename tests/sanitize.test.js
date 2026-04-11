/**
 * Unit tests for src/utils/sanitize.js
 *
 * Validates that all user-supplied input is sanitized before it
 * reaches Firebase or the UI.
 */

const {
  sanitizePlaceName,
  sanitizeReportLevel,
  isValidPlaceId,
  VALID_LEVELS,
} = require("../src/utils/sanitize");

// ─────────────────────────────────────────────
// sanitizePlaceName
// ─────────────────────────────────────────────
describe("sanitizePlaceName", () => {
  test("trims leading and trailing whitespace", () => {
    expect(sanitizePlaceName("  My Cafe  ")).toBe("My Cafe");
  });

  test("strips HTML script tags and their content", () => {
    // The regex strips the full <tag>…</tag> block, leaving nothing.
    expect(sanitizePlaceName("<script>alert(1)</script>")).toBe("");
  });

  test("strips content wrapped in angle brackets", () => {
    // <B> is treated as an HTML element — its content is stripped along with the tag.
    // The result is the surrounding safe characters without B.
    const result = sanitizePlaceName("A<B>C");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  test("strips ampersand characters", () => {
    expect(sanitizePlaceName("Coffee & Co")).toBe("Coffee  Co");
  });

  test("strips double-quote characters", () => {
    expect(sanitizePlaceName(`"My Place"`)).toBe("My Place");
  });

  test("strips javascript: URI scheme", () => {
    expect(sanitizePlaceName("javascript:alert(1)")).toBe("alert(1)");
  });

  test("enforces maximum length of 80 characters", () => {
    const long = "A".repeat(100);
    expect(sanitizePlaceName(long)).toHaveLength(80);
  });

  test("returns empty string for non-string input", () => {
    expect(sanitizePlaceName(null)).toBe("");
    expect(sanitizePlaceName(undefined)).toBe("");
    expect(sanitizePlaceName(42)).toBe("");
  });

  test("passes through a clean name unchanged", () => {
    expect(sanitizePlaceName("Greenway Park")).toBe("Greenway Park");
  });
});

// ─────────────────────────────────────────────
// sanitizeReportLevel
// ─────────────────────────────────────────────
describe("sanitizeReportLevel", () => {
  test.each(VALID_LEVELS)("accepts valid level: %s", (level) => {
    expect(sanitizeReportLevel(level)).toBe(level);
  });

  test("rejects an arbitrary string", () => {
    expect(sanitizeReportLevel("veryhigh")).toBeNull();
  });

  test("rejects an empty string", () => {
    expect(sanitizeReportLevel("")).toBeNull();
  });

  test("rejects null", () => {
    expect(sanitizeReportLevel(null)).toBeNull();
  });

  test("is case-sensitive — lowercase level is rejected", () => {
    expect(sanitizeReportLevel("low")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// isValidPlaceId
// ─────────────────────────────────────────────
describe("isValidPlaceId", () => {
  test("accepts a normal place id", () => {
    expect(isValidPlaceId("canteen")).toBe(true);
  });

  test("accepts a dash-separated import id", () => {
    expect(isValidPlaceId("import-my-cafe-1712345678")).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isValidPlaceId("")).toBe(false);
  });

  test("rejects whitespace-only string", () => {
    expect(isValidPlaceId("   ")).toBe(false);
  });

  test("rejects null", () => {
    expect(isValidPlaceId(null)).toBe(false);
  });

  test("rejects undefined", () => {
    expect(isValidPlaceId(undefined)).toBe(false);
  });

  test("rejects id containing a < character", () => {
    expect(isValidPlaceId("place<id>")).toBe(false);
  });

  test("rejects id containing a > character", () => {
    expect(isValidPlaceId("<script>")).toBe(false);
  });
});
