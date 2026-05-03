/**
 * Unit tests for src/utils/crowdBlending.js
 *
 * Covers the weighted report blending pipeline:
 * - summarizeReports : build a summary from a report array
 * - mergeRealtimeSignals : blend a base prediction with a live summary
 * - clamp             : numeric clamping helper
 */

const {
  summarizeReports,
  mergeRealtimeSignals,
  clamp,
  MAX_REPORT_WINDOW,
  LEVEL_TO_SCORE,
} = require("../src/utils/crowdBlending");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal report object for use in tests.
 * @param {"Low"|"Medium"|"High"} level
 * @param {number} [minsAgo=0] - How many minutes ago the report was created.
 */
function makeReport(level, minsAgo = 0) {
  return {
    id:          `r-${Math.random().toString(36).slice(2)}`,
    placeId:     "test-place",
    level,
    createdAtMs: Date.now() - minsAgo * 60_000,
  };
}

const BASE_CROWD = Object.freeze({
  score:   0.5,
  level:   "Medium",
  wait:    "7 min",
  percent: 50,
});

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  test("returns value unchanged when within [0, 1]", () => {
    expect(clamp(0.5)).toBe(0.5);
  });

  test("clamps value below 0 to 0", () => {
    expect(clamp(-0.5)).toBe(0);
  });

  test("clamps value above 1 to 1", () => {
    expect(clamp(1.5)).toBe(1);
  });

  test("respects custom min and max", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

// ── LEVEL_TO_SCORE ─────────────────────────────────────────────────────────────

describe("LEVEL_TO_SCORE", () => {
  test("Low score is less than Medium", () => {
    expect(LEVEL_TO_SCORE.Low).toBeLessThan(LEVEL_TO_SCORE.Medium);
  });

  test("Medium score is less than High", () => {
    expect(LEVEL_TO_SCORE.Medium).toBeLessThan(LEVEL_TO_SCORE.High);
  });

  test("all scores are within [0, 1]", () => {
    Object.values(LEVEL_TO_SCORE).forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

// ── summarizeReports ──────────────────────────────────────────────────────────

describe("summarizeReports", () => {
  test("returns null for an empty array", () => {
    expect(summarizeReports([])).toBeNull();
  });

  test("returns a valid summary for a single report", () => {
    const result = summarizeReports([makeReport("High")]);
    expect(result).not.toBeNull();
    expect(result.sampleSize).toBe(1);
    expect(["Low", "Medium", "High"]).toContain(result.level);
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
  });

  test("averageScore is within [0, 1] for mixed-level reports", () => {
    const reports = [makeReport("Low"), makeReport("High"), makeReport("Medium")];
    const result  = summarizeReports(reports);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
    expect(result.averageScore).toBeLessThanOrEqual(1);
  });

  test("caps sampleSize at MAX_REPORT_WINDOW (10) when given more reports", () => {
    const reports = Array.from({ length: 15 }, () => makeReport("Medium"));
    const result  = summarizeReports(reports);
    expect(result.sampleSize).toBe(MAX_REPORT_WINDOW);
  });

  test("all-High reports produce a High level", () => {
    const reports = Array.from({ length: 5 }, () => makeReport("High"));
    const result  = summarizeReports(reports);
    expect(result.level).toBe("High");
  });

  test("all-Low reports produce a Low level", () => {
    const reports = Array.from({ length: 5 }, () => makeReport("Low"));
    const result  = summarizeReports(reports);
    expect(result.level).toBe("Low");
  });

  test("percent equals Math.round(averageScore * 100)", () => {
    const reports = [makeReport("Medium"), makeReport("High")];
    const result  = summarizeReports(reports);
    expect(result.percent).toBe(Math.round(result.averageScore * 100));
  });

  test("trend is negative when newest reports are calmer than oldest", () => {
    // Oldest = High, newest = Low — trend should be negative.
    const reports = [
      makeReport("Low",  0),
      makeReport("Low",  1),
      makeReport("High", 5),
      makeReport("High", 6),
    ];
    const result = summarizeReports(reports);
    expect(result.trend).toBeLessThan(0);
  });

  test("returns reports array containing at most MAX_REPORT_WINDOW items", () => {
    const reports = Array.from({ length: 12 }, () => makeReport("Medium"));
    const result  = summarizeReports(reports);
    expect(result.reports.length).toBeLessThanOrEqual(MAX_REPORT_WINDOW);
  });
});

// ── mergeRealtimeSignals ──────────────────────────────────────────────────────

describe("mergeRealtimeSignals", () => {
  test("returns base crowd with liveSampleSize=0 when summary is null", () => {
    const result = mergeRealtimeSignals(BASE_CROWD, null, 0);
    expect(result.score).toBe(BASE_CROWD.score);
    expect(result.liveSampleSize).toBe(0);
    expect(result.liveTrend).toBe(0);
  });

  test("blended score is within [0, 1]", () => {
    const summary = summarizeReports(
      Array.from({ length: 5 }, () => makeReport("High"))
    );
    const result = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  test("blended score moves toward High summary when base is Medium", () => {
    const summary = summarizeReports(
      Array.from({ length: 6 }, () => makeReport("High"))
    );
    const result = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    expect(result.score).toBeGreaterThan(BASE_CROWD.score);
  });

  test("blended score moves toward Low summary when base is Medium", () => {
    const summary = summarizeReports(
      Array.from({ length: 6 }, () => makeReport("Low"))
    );
    const result = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    expect(result.score).toBeLessThan(BASE_CROWD.score);
  });

  test("large hourDistance reduces signal impact toward the base score", () => {
    const summary = summarizeReports(
      Array.from({ length: 5 }, () => makeReport("High"))
    );
    const nearResult = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    const farResult  = mergeRealtimeSignals(BASE_CROWD, summary, 4);
    // Farther in time → closer to the base score.
    expect(Math.abs(farResult.score - BASE_CROWD.score))
      .toBeLessThanOrEqual(Math.abs(nearResult.score - BASE_CROWD.score) + 0.001);
  });

  test("result carries liveSampleSize from the summary", () => {
    const reports = Array.from({ length: 4 }, () => makeReport("Medium"));
    const summary = summarizeReports(reports);
    const result  = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    expect(result.liveSampleSize).toBe(4);
  });

  test("result has level, wait, percent fields", () => {
    const summary = summarizeReports([makeReport("Medium")]);
    const result  = mergeRealtimeSignals(BASE_CROWD, summary, 0);
    expect(typeof result.level).toBe("string");
    expect(typeof result.wait).toBe("string");
    expect(typeof result.percent).toBe("number");
  });
});
