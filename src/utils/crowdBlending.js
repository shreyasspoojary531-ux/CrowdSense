/**
 * crowdBlending.js — pure crowd signal blending utilities.
 *
 * Extracted from useCrowdState so this logic can be unit-tested in isolation
 * without setting up a React hook environment.
 *
 * All functions are pure (no side-effects) and depend only on their arguments.
 */

import { scoreToLevel, scoreToWait } from "./prediction";

/** Maximum number of live reports retained per place for blending. */
export const MAX_REPORT_WINDOW = 10;

/**
 * Numeric score assigned to each crowd level label.
 * Used to compute weighted averages from text-based user reports.
 */
export const LEVEL_TO_SCORE = Object.freeze({
  Low:    0.2,
  Medium: 0.54,
  High:   0.86,
});

/** Clamp a numeric value to [min, max]. */
export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute a weighted, recency-biased summary from a list of crowd reports.
 * More recent reports carry higher weight; older ones decay to 45 %.
 *
 * @param {object[]} reports - Array of report objects with a `level` field.
 * @returns {object|null} Summary stats, or null if no reports are provided.
 */
export function summarizeReports(reports) {
  const recent = reports.slice(0, MAX_REPORT_WINDOW);
  if (recent.length === 0) return null;

  let weightedSum  = 0;
  let totalWeight  = 0;

  recent.forEach((report, index) => {
    const weight  = Math.max(0.45, 1 - index * 0.08);
    weightedSum  += (LEVEL_TO_SCORE[report.level] ?? LEVEL_TO_SCORE.Medium) * weight;
    totalWeight  += weight;
  });

  const averageScore  = weightedSum / totalWeight;
  const newestWindow  = recent.slice(0, Math.min(3, recent.length));
  const oldestWindow  = recent.slice(-Math.min(3, recent.length));

  const avg = (arr) =>
    arr.reduce((sum, r) => sum + (LEVEL_TO_SCORE[r.level] ?? LEVEL_TO_SCORE.Medium), 0) / arr.length;

  return {
    sampleSize:  recent.length,
    averageScore,
    percent:     Math.round(averageScore * 100),
    level:       scoreToLevel(averageScore),
    trend:       avg(newestWindow) - avg(oldestWindow),
    latestAtMs:  recent[0].createdAtMs || 0,
    reports:     recent,
  };
}

/**
 * Blend a base crowd prediction with real-time report signals.
 * Signal strength scales with sample size; older reports decay via timeDecay.
 *
 * @param {object} baseCrowd    - Output of getCrowdAt (score, level, wait, percent).
 * @param {object|null} summary - Output of summarizeReports, or null.
 * @param {number} hourDistance - Hours between the base prediction hour and now.
 * @returns {object} Merged crowd object carrying live sample metadata.
 */
export function mergeRealtimeSignals(baseCrowd, summary, hourDistance) {
  if (!summary) {
    return { ...baseCrowd, liveSampleSize: 0, liveTrend: 0 };
  }

  const signalStrength = Math.min(0.48, 0.14 + summary.sampleSize * 0.035);
  const timeDecay      = Math.max(0.22, 1 - Math.min(hourDistance, 4) / 4);
  const blendWeight    = signalStrength * timeDecay;
  const rawScore       = baseCrowd.score * (1 - blendWeight) + summary.averageScore * blendWeight;
  const score          = clamp(Number.isFinite(rawScore) ? rawScore : baseCrowd.score);

  return {
    ...baseCrowd,
    score,
    level:          scoreToLevel(score),
    wait:           scoreToWait(score),
    percent:        Math.round(score * 100),
    liveSampleSize: summary.sampleSize,
    liveTrend:      summary.trend,
  };
}
