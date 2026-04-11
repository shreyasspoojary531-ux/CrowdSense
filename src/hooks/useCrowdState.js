/**
 * useCrowdState — central state hook for CrowdSense.
 *
 * Responsibilities:
 * - Clock tick to keep crowd values fresh every 30 minutes.
 * - Firebase (or local) real-time report subscription.
 * - Aggregation and blending of live reports with AI crowd predictions.
 * - Visitor intent (commitment) tracking.
 * - Toast notification dispatch.
 *
 * Returns a stable API object — all callbacks are wrapped in useCallback
 * so child components that depend on them can be wrapped in React.memo
 * without triggering unnecessary re-renders.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBestTime,
  getCrowdAt,
  getPrediction,
  getSmartTip,
  formatHour,
  scoreToLevel,
  scoreToWait,
} from "../utils/prediction";
import {
  getRealtimeModeLabel,
  publishLiveReport,
  subscribeToLiveReports,
} from "../lib/liveReports";

/** Maximum number of live reports retained per place for blending. */
const MAX_REPORT_WINDOW = 10;

/**
 * Map crowd level labels to their numeric score equivalents.
 * Used to compute weighted averages from text-based user reports.
 */
const LEVEL_TO_SCORE = {
  Low: 0.2,
  Medium: 0.54,
  High: 0.86,
};

/** Clamp a numeric value to [min, max]. */
function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute a weighted, recency-biased summary from a list of crowd reports.
 * More recent reports carry higher weight; older ones decay to 45 %.
 *
 * @param {object[]} reports
 * @returns {object|null} Summary stats or null if no reports.
 */
function summarizeReports(reports) {
  const recent = reports.slice(0, MAX_REPORT_WINDOW);
  if (recent.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  recent.forEach((report, index) => {
    const weight = Math.max(0.45, 1 - index * 0.08);
    weightedSum += (LEVEL_TO_SCORE[report.level] || 0.54) * weight;
    totalWeight += weight;
  });

  const averageScore = weightedSum / totalWeight;
  const newestWindow = recent.slice(0, Math.min(3, recent.length));
  const oldestWindow = recent.slice(-Math.min(3, recent.length));
  const newestAvg =
    newestWindow.reduce((sum, r) => sum + (LEVEL_TO_SCORE[r.level] || 0.54), 0) /
    newestWindow.length;
  const oldestAvg =
    oldestWindow.reduce((sum, r) => sum + (LEVEL_TO_SCORE[r.level] || 0.54), 0) /
    oldestWindow.length;

  return {
    sampleSize: recent.length,
    averageScore,
    percent: Math.round(averageScore * 100),
    level: scoreToLevel(averageScore),
    trend: newestAvg - oldestAvg,
    latestAtMs: recent[0].createdAtMs || 0,
    reports: recent,
  };
}

/**
 * Blend a base prediction with real-time report signals.
 * Signal strength scales with sample size; older reports decay via timeDecay.
 *
 * @param {object} baseCrowd - Output of getCrowdAt.
 * @param {object|null} summary - Output of summarizeReports.
 * @param {number} hourDistance - Hours between the base prediction and now.
 * @returns {object} Merged crowd object.
 */
function mergeRealtimeSignals(baseCrowd, summary, hourDistance) {
  if (!summary) return { ...baseCrowd, liveSampleSize: 0, liveTrend: 0 };

  const signalStrength = Math.min(0.48, 0.14 + summary.sampleSize * 0.035);
  const timeDecay = Math.max(0.22, 1 - Math.min(hourDistance, 4) / 4);
  const blendWeight = signalStrength * timeDecay;
  const rawScore = baseCrowd.score * (1 - blendWeight) + summary.averageScore * blendWeight;
  const score = clamp(isNaN(rawScore) ? baseCrowd.score : rawScore);

  return {
    ...baseCrowd,
    score,
    level: scoreToLevel(score),
    wait: scoreToWait(score),
    percent: Math.round(score * 100),
    liveSampleSize: summary.sampleSize,
    liveTrend: summary.trend,
  };
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

/**
 * Central crowd state hook.
 *
 * @param {object[]} places - All tracked places (static + imported).
 * @returns {object} Stable crowd state API.
 */
export function useCrowdState(places) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [commitments, setCommitments] = useState({});
  const [toast, setToast] = useState(null);
  const [liveReports, setLiveReports] = useState([]);
  const [realtimeError, setRealtimeError] = useState(null);
  const toastTimerRef = useRef(null);

  // ── Clock — ticks every 30 minutes to refresh predictions ──
  useEffect(() => {
    const interval = window.setInterval(() => setClockMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Toast ──
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Cleanup toast timer on unmount.
  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  // ── Firebase / Local realtime subscription ──
  useEffect(() => {
    const unsubscribe = subscribeToLiveReports(setLiveReports, (error) => {
      setRealtimeError(error);
      showToast("Live sync paused. Realtime data will retry automatically.");
    });
    return () => unsubscribe?.();
  }, [showToast]);

  // ── Derived values ──
  const seed = useMemo(() => Math.floor(clockMs / 300_000), [clockMs]);

  const currentHour = useMemo(() => {
    const now = new Date(clockMs);
    return now.getHours() + now.getMinutes() / 60;
  }, [clockMs]);

  /** Reports grouped by placeId, capped at MAX_REPORT_WINDOW. */
  const reportGroups = useMemo(() => {
    const grouped = {};
    liveReports.forEach((report) => {
      if (!grouped[report.placeId]) grouped[report.placeId] = [];
      if (grouped[report.placeId].length < MAX_REPORT_WINDOW) {
        grouped[report.placeId].push(report);
      }
    });
    return grouped;
  }, [liveReports]);

  /** Computed summary stats per place. */
  const reportSummaries = useMemo(() => {
    const summaries = {};
    Object.entries(reportGroups).forEach(([placeId, reports]) => {
      summaries[placeId] = summarizeReports(reports);
    });
    return summaries;
  }, [reportGroups]);

  /** Global report count stats. */
  const reportStats = useMemo(() => ({
    totalReports: liveReports.length,
    activePlaces: Object.keys(reportGroups).length,
    latestReport: liveReports[0] || null,
  }), [liveReports, reportGroups]);

  // ── Public API callbacks — all stable via useCallback ──

  const getReportSummary = useCallback(
    (placeId) => reportSummaries[placeId] || null,
    [reportSummaries]
  );

  const getRecentReports = useCallback(
    (placeId, count = 5) => (reportGroups[placeId] || []).slice(0, count),
    [reportGroups]
  );

  const getCrowd = useCallback(
    (place) => {
      const base = getCrowdAt(place, currentHour, seed, commitments);
      return mergeRealtimeSignals(base, getReportSummary(place.id), 0);
    },
    [commitments, currentHour, getReportSummary, seed]
  );

  const getCrowdAtHour = useCallback(
    (place, hour) => {
      const base = getCrowdAt(place, hour, seed, commitments);
      return mergeRealtimeSignals(base, getReportSummary(place.id), Math.abs(hour - currentHour));
    },
    [commitments, currentHour, getReportSummary, seed]
  );

  const getDetail = useCallback(
    (place) => {
      const crowd = getCrowd(place);
      const prediction = getPrediction(place, seed, commitments).map((slot) =>
        mergeRealtimeSignals(slot, getReportSummary(place.id), Math.abs(slot.hour - currentHour))
      );
      const best = getBestTime(place, seed, commitments);
      const tip = getSmartTip(place, crowd, best);
      return { crowd, prediction, best, tip };
    },
    [commitments, currentHour, getCrowd, getReportSummary, seed]
  );

  /** Submit a crowd report. Catches errors and shows a toast on failure. */
  const submitReport = useCallback(
    async (placeId, level, options = {}) => {
      const matchedPlace = places.find((p) => p.id === placeId);
      const placeName = options.placeName || matchedPlace?.name || placeId;

      try {
        await publishLiveReport({ placeId, placeName, level });
        showToast(`Live report added for ${placeName}. CrowdSense updated instantly.`);
      } catch {
        showToast("Failed to submit report. Please try again.");
      }
    },
    [places, showToast]
  );

  /** Register visitor intent for a time slot, nudging crowd predictions. */
  const commitToTime = useCallback((placeId, hour) => {
    const halfHour = Math.round(hour * 2) / 2;
    const key = `${placeId}_${halfHour}`;
    const othersCount = 3 + Math.floor(Math.random() * 9);

    setCommitments((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    return { othersCount, label: formatHour(halfHour), key };
  }, []);

  const getCommitmentCount = useCallback(
    (placeId, hour) => {
      const halfHour = Math.round(hour * 2) / 2;
      return commitments[`${placeId}_${halfHour}`] || 0;
    },
    [commitments]
  );

  const isBecomingCrowded = useCallback(
    (placeId, hour) => getCommitmentCount(placeId, hour) >= 2,
    [getCommitmentCount]
  );

  return {
    getCrowd,
    getCrowdAtHour,
    getDetail,
    submitReport,
    commitToTime,
    getCommitmentCount,
    isBecomingCrowded,
    getReportSummary,
    getRecentReports,
    commitments,
    toast,
    showToast,
    reportStats,
    liveReports,
    realtimeError,
    realtimeModeLabel: getRealtimeModeLabel(),
  };
}
