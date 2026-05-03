/**
 * useCrowdState — central state hook for CrowdSense.
 *
 * Responsibilities:
 * - Clock tick to keep crowd values fresh every 30 seconds.
 * - Firebase (or local) real-time report subscription.
 * - Aggregation and blending of live reports with AI crowd predictions.
 * - Visitor intent (commitment) tracking.
 * - Toast notification dispatch.
 *
 * Returns a stable API object — all callbacks are wrapped in useCallback
 * so child components that depend on them can be wrapped in React.memo
 * without triggering unnecessary re-renders.
 *
 * The seed value derived from clockMs changes every 5 minutes, so the
 * crowd computations only recalculate at that cadence despite the
 * 30-second clock tick.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBestTime,
  getCrowdAt,
  getPrediction,
  getSmartTip,
  formatHour,
} from "../utils/prediction";
import {
  getRealtimeModeLabel,
  publishLiveReport,
  subscribeToLiveReports,
} from "../lib/liveReports";
import {
  MAX_REPORT_WINDOW,
  mergeRealtimeSignals,
  summarizeReports,
} from "../utils/crowdBlending";

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
  const [clockMs, setClockMs]         = useState(() => Date.now());
  const [commitments, setCommitments] = useState({});
  const [toast, setToast]             = useState(null);
  const [liveReports, setLiveReports] = useState([]);
  const [realtimeError, setRealtimeError] = useState(null);
  const toastTimerRef = useRef(null);

  // ── Clock — ticks every 30 seconds to keep UI data fresh ──
  useEffect(() => {
    const interval = window.setInterval(() => setClockMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Cleanup toast timer on unmount.
  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  // ── Firebase / Local realtime subscription ─────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToLiveReports(setLiveReports, (error) => {
      setRealtimeError(error);
      showToast("Live sync paused. Realtime data will retry automatically.");
    });
    return () => unsubscribe?.();
  }, [showToast]);

  // ── Derived values ─────────────────────────────────────────────────────

  // Seed changes every 5 minutes — gates the expensive crowd recalculation.
  const seed = useMemo(() => Math.floor(clockMs / 300_000), [clockMs]);

  const currentHour = useMemo(() => {
    const now = new Date(clockMs);
    return now.getHours() + now.getMinutes() / 60;
  }, [clockMs]);

  /** Reports grouped by placeId, capped at MAX_REPORT_WINDOW per place. */
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

  /** Weighted summary stats per place, memoised from reportGroups. */
  const reportSummaries = useMemo(() => {
    const summaries = {};
    Object.entries(reportGroups).forEach(([placeId, reports]) => {
      summaries[placeId] = summarizeReports(reports);
    });
    return summaries;
  }, [reportGroups]);

  /** Global report count stats exposed to the UI. */
  const reportStats = useMemo(
    () => ({
      totalReports:  liveReports.length,
      activePlaces:  Object.keys(reportGroups).length,
      latestReport:  liveReports[0] || null,
    }),
    [liveReports, reportGroups]
  );

  // ── Public API — all callbacks stable via useCallback ──────────────────

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
      return mergeRealtimeSignals(
        base,
        getReportSummary(place.id),
        Math.abs(hour - currentHour)
      );
    },
    [commitments, currentHour, getReportSummary, seed]
  );

  const getDetail = useCallback(
    (place) => {
      const crowd      = getCrowd(place);
      const prediction = getPrediction(place, seed, commitments).map((slot) =>
        mergeRealtimeSignals(
          slot,
          getReportSummary(place.id),
          Math.abs(slot.hour - currentHour)
        )
      );
      const best = getBestTime(place, seed, commitments);
      const tip  = getSmartTip(place, crowd, best);
      return { crowd, prediction, best, tip };
    },
    [commitments, currentHour, getCrowd, getReportSummary, seed]
  );

  /** Submit a crowd report. Catches all errors and surfaces a toast on failure. */
  const submitReport = useCallback(
    async (placeId, level, options = {}) => {
      const matchedPlace = places.find((p) => p.id === placeId);
      const placeName    = options.placeName || matchedPlace?.name || placeId;

      try {
        await publishLiveReport({ placeId, placeName, level });
        showToast(`Live report added for ${placeName}. CrowdSense updated instantly.`);
      } catch {
        showToast("Failed to submit report. Please try again.");
      }
    },
    [places, showToast]
  );

  /** Register visitor intent for a time slot, nudging the crowd prediction. */
  const commitToTime = useCallback((placeId, hour) => {
    const halfHour    = Math.round(hour * 2) / 2;
    const key         = `${placeId}_${halfHour}`;
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
