/**
 * Unit tests for src/utils/prediction.js
 *
 * Covers the core crowd prediction engine:
 * - getCrowdAt  : per-hour crowd calculation
 * - getPrediction: generates forecast slots
 * - getBestTime  : finds the optimal visit window
 * - scoreToLevel / scoreToWait: threshold helpers
 * - formatHour  : label formatting
 */

const {
  getCrowdAt,
  getPrediction,
  getBestTime,
  scoreToLevel,
  scoreToWait,
  formatHour,
} = require("../src/utils/prediction");

/** Minimal place fixture used across tests. */
const SAMPLE_PLACE = {
  id: "test-canteen",
  name: "Test Canteen",
  peakHours: [[12, 14], [18, 20]],
  capacity: 200,
};

// ─────────────────────────────────────────────
// getCrowdAt
// ─────────────────────────────────────────────
describe("getCrowdAt", () => {
  test("returns percent in range [0, 100]", () => {
    for (let h = 0; h < 24; h++) {
      const result = getCrowdAt(SAMPLE_PLACE, h, 0);
      expect(result.percent).toBeGreaterThanOrEqual(0);
      expect(result.percent).toBeLessThanOrEqual(100);
    }
  });

  test("returns score in range [0, 1]", () => {
    const result = getCrowdAt(SAMPLE_PLACE, 13, 0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  test("score is higher during peak hours than off-peak", () => {
    const peakResult = getCrowdAt(SAMPLE_PLACE, 13, 42); // midday peak
    const offPeakResult = getCrowdAt(SAMPLE_PLACE, 3, 42); // 3 AM
    expect(peakResult.score).toBeGreaterThan(offPeakResult.score);
  });

  test("commitment pressure pushes score upward", () => {
    const key = `${SAMPLE_PLACE.id}_13`;
    const base = getCrowdAt(SAMPLE_PLACE, 13, 0, {});
    const withPressure = getCrowdAt(SAMPLE_PLACE, 13, 0, { [key]: 5 });
    expect(withPressure.score).toBeGreaterThanOrEqual(base.score);
  });

  test("returns a level string of Low, Medium, or High", () => {
    const { level } = getCrowdAt(SAMPLE_PLACE, 10, 0);
    expect(["Low", "Medium", "High"]).toContain(level);
  });

  test("returns a wait string", () => {
    const { wait } = getCrowdAt(SAMPLE_PLACE, 12, 0);
    expect(typeof wait).toBe("string");
    expect(wait.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// scoreToLevel
// ─────────────────────────────────────────────
describe("scoreToLevel", () => {
  test("score < 0.38 → Low", () => {
    expect(scoreToLevel(0)).toBe("Low");
    expect(scoreToLevel(0.2)).toBe("Low");
    expect(scoreToLevel(0.37)).toBe("Low");
  });

  test("0.38 <= score < 0.65 → Medium", () => {
    expect(scoreToLevel(0.38)).toBe("Medium");
    expect(scoreToLevel(0.5)).toBe("Medium");
    expect(scoreToLevel(0.64)).toBe("Medium");
  });

  test("score >= 0.65 → High", () => {
    expect(scoreToLevel(0.65)).toBe("High");
    expect(scoreToLevel(0.85)).toBe("High");
    expect(scoreToLevel(1)).toBe("High");
  });
});

// ─────────────────────────────────────────────
// scoreToWait
// ─────────────────────────────────────────────
describe("scoreToWait", () => {
  test("low score returns short wait string", () => {
    expect(scoreToWait(0.1)).toBe("< 2 min");
  });

  test("medium score returns numeric wait in minutes", () => {
    const wait = scoreToWait(0.5);
    expect(wait).toMatch(/\d+ min/);
  });

  test("high score returns longer wait", () => {
    const highWait = parseInt(scoreToWait(0.9), 10);
    const medWait = parseInt(scoreToWait(0.5), 10);
    expect(highWait).toBeGreaterThan(medWait);
  });
});

// ─────────────────────────────────────────────
// getPrediction
// ─────────────────────────────────────────────
describe("getPrediction", () => {
  test("returns exactly 6 slots", () => {
    const slots = getPrediction(SAMPLE_PLACE, 0, {});
    expect(slots).toHaveLength(6);
  });

  test("each slot has required fields", () => {
    const slots = getPrediction(SAMPLE_PLACE, 0, {});
    slots.forEach((slot) => {
      expect(typeof slot.label).toBe("string");
      expect(typeof slot.hour).toBe("number");
      expect(typeof slot.percent).toBe("number");
      expect(["Low", "Medium", "High"]).toContain(slot.level);
    });
  });

  test("slot hours are in ascending order", () => {
    const slots = getPrediction(SAMPLE_PLACE, 0, {});
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].hour).toBeGreaterThan(slots[i - 1].hour);
    }
  });
});

// ─────────────────────────────────────────────
// getBestTime
// ─────────────────────────────────────────────
describe("getBestTime", () => {
  test("returns an object with label, hour, score, level", () => {
    const best = getBestTime(SAMPLE_PLACE, 0, {});
    expect(typeof best.label).toBe("string");
    expect(typeof best.hour).toBe("number");
    expect(typeof best.score).toBe("number");
    expect(["Low", "Medium", "High"]).toContain(best.level);
  });

  test("best score is near the minimum of sampled slot scores", () => {
    const best = getBestTime(SAMPLE_PLACE, 0, {});
    // getBestTime searches 13 half-hour slots. We verify best.score is competitive
    // against a subset using a generous 0.08 tolerance for the noise() offset.
    for (let h = 0; h <= 6; h++) {
      const sample = getCrowdAt(SAMPLE_PLACE, h, 0);
      expect(best.score).toBeLessThanOrEqual(sample.score + 0.08);
    }
  });
});

// ─────────────────────────────────────────────
// formatHour
// ─────────────────────────────────────────────
describe("formatHour", () => {
  test("formats midnight correctly", () => {
    expect(formatHour(0)).toBe("12:00 AM");
  });

  test("formats noon correctly", () => {
    expect(formatHour(12)).toBe("12:00 PM");
  });

  test("formats half-hour correctly", () => {
    expect(formatHour(13.5)).toBe("1:30 PM");
  });

  test("always includes AM or PM suffix", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const label = formatHour(h);
      expect(label).toMatch(/AM|PM/);
    }
  });
});
