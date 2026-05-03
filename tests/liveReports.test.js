/**
 * Unit tests for src/lib/liveReports.js
 *
 * Covers the input validation and local-mode publish path of publishLiveReport.
 *
 * Firebase is not configured in the test environment (no VITE_* env vars),
 * so all successful writes use the localStorage fallback path.
 * The localStorage API is absent in Node — writeLocalReports / readLocalReports
 * guard against this with `typeof window === "undefined"` checks, so the
 * local fallback completes as a no-op write and the function still returns
 * the constructed report object.
 *
 * NOTE: The in-memory rate limiter in liveReports.js is module-level state.
 * Tests that expect a successful publish run first; validation-rejection tests
 * throw before the rate limiter is consulted and therefore do not consume a slot.
 */

const { publishLiveReport } = require("../src/lib/liveReports");

// ── Validation — placeId ──────────────────────────────────────────────────────

describe("publishLiveReport — placeId validation", () => {
  test("throws for an empty string placeId", async () => {
    await expect(
      publishLiveReport({ placeId: "", placeName: "Test", level: "Low" })
    ).rejects.toThrow("Invalid placeId");
  });

  test("throws for a whitespace-only placeId", async () => {
    await expect(
      publishLiveReport({ placeId: "   ", placeName: "Test", level: "Low" })
    ).rejects.toThrow("Invalid placeId");
  });

  test("throws for a null placeId", async () => {
    await expect(
      publishLiveReport({ placeId: null, placeName: "Test", level: "Low" })
    ).rejects.toThrow("Invalid placeId");
  });

  test("throws for an undefined placeId", async () => {
    await expect(
      publishLiveReport({ placeId: undefined, placeName: "Test", level: "Low" })
    ).rejects.toThrow("Invalid placeId");
  });

  test("throws for a placeId containing HTML injection characters", async () => {
    await expect(
      publishLiveReport({ placeId: "<script>alert(1)</script>", placeName: "Test", level: "Low" })
    ).rejects.toThrow("Invalid placeId");
  });
});

// ── Validation — level ────────────────────────────────────────────────────────

describe("publishLiveReport — level validation", () => {
  test("throws for an unrecognised level string", async () => {
    await expect(
      publishLiveReport({ placeId: "valid-place", placeName: "Test", level: "VeryHigh" })
    ).rejects.toThrow("Invalid report level");
  });

  test("throws for a lowercase valid level (case-sensitive)", async () => {
    await expect(
      publishLiveReport({ placeId: "valid-place", placeName: "Test", level: "high" })
    ).rejects.toThrow("Invalid report level");
  });

  test("throws for an empty level", async () => {
    await expect(
      publishLiveReport({ placeId: "valid-place", placeName: "Test", level: "" })
    ).rejects.toThrow("Invalid report level");
  });

  test("throws for a null level", async () => {
    await expect(
      publishLiveReport({ placeId: "valid-place", placeName: "Test", level: null })
    ).rejects.toThrow("Invalid report level");
  });
});

// ── Successful publish (local / no-Firebase mode) ─────────────────────────────

describe("publishLiveReport — successful publish", () => {
  test("returns a report object for valid inputs", async () => {
    const result = await publishLiveReport({
      placeId:   "test-venue-prod",
      placeName: "Test Venue",
      level:     "High",
    });

    expect(result).toMatchObject({
      placeId:   "test-venue-prod",
      placeName: "Test Venue",
      level:     "High",
    });
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
    expect(typeof result.createdAtMs).toBe("number");
    expect(result.createdAtMs).toBeGreaterThan(0);
  });

  test("accepts all three valid crowd levels", async () => {
    for (const level of ["Low", "Medium", "High"]) {
      const result = await publishLiveReport({
        placeId:   `place-level-test-${level.toLowerCase()}`,
        placeName: "Level Test",
        level,
      });
      expect(result.level).toBe(level);
    }
  });

  test("truncates placeName longer than 120 characters", async () => {
    const longName = "A".repeat(200);
    const result   = await publishLiveReport({
      placeId:   "truncation-test-place",
      placeName: longName,
      level:     "Low",
    });
    expect(result.placeName.length).toBeLessThanOrEqual(120);
  });
});
