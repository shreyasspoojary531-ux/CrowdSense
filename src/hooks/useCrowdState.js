import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBestTime, getCrowdAt, getPrediction, getSmartTip, formatHour } from "../utils/prediction";
import {
  getRealtimeModeLabel,
  publishLiveReport,
  subscribeToLiveReports,
} from "../lib/liveReports";

const MAX_REPORT_WINDOW = 10;

const LEVEL_TO_SCORE = {
  Low: 0.2,
  Medium: 0.54,
  High: 0.86,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function scoreToLevel(score) {
  if (score >= 0.65) return "High";
  if (score >= 0.38) return "Medium";
  return "Low";
}

function scoreToWait(score) {
  if (score < 0.38) return "< 2 min";
  if (score < 0.65) return `${Math.round(5 + score * 10)} min`;
  return `${Math.round(15 + score * 25)} min`;
}

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
  const newestAverage =
    newestWindow.reduce((sum, report) => sum + (LEVEL_TO_SCORE[report.level] || 0.54), 0) /
    newestWindow.length;
  const oldestAverage =
    oldestWindow.reduce((sum, report) => sum + (LEVEL_TO_SCORE[report.level] || 0.54), 0) /
    oldestWindow.length;

  return {
    sampleSize: recent.length,
    averageScore,
    percent: Math.round(averageScore * 100),
    level: scoreToLevel(averageScore),
    trend: newestAverage - oldestAverage,
    latestAtMs: recent[0].createdAtMs || 0,
    reports: recent,
  };
}

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

export function useCrowdState(places) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [commitments, setCommitments] = useState({});
  const [toast, setToast] = useState(null);
  const [liveReports, setLiveReports] = useState([]);
  const [realtimeError, setRealtimeError] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockMs(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const unsubscribe = subscribeToLiveReports(setLiveReports, (error) => {
      setRealtimeError(error);
      showToast("Live sync paused. Realtime data will retry automatically.");
    });

    return () => unsubscribe?.();
  }, [showToast]);

  const seed = useMemo(() => Math.floor(clockMs / 300000), [clockMs]);
  const currentHour = useMemo(() => {
    const now = new Date(clockMs);
    return now.getHours() + now.getMinutes() / 60;
  }, [clockMs]);

  const reportGroups = useMemo(() => {
    const grouped = {};

    liveReports.forEach((report) => {
      if (!grouped[report.placeId]) {
        grouped[report.placeId] = [];
      }

      if (grouped[report.placeId].length < MAX_REPORT_WINDOW) {
        grouped[report.placeId].push(report);
      }
    });

    return grouped;
  }, [liveReports]);

  const reportSummaries = useMemo(() => {
    const summaries = {};

    Object.entries(reportGroups).forEach(([placeId, reports]) => {
      summaries[placeId] = summarizeReports(reports);
    });

    return summaries;
  }, [reportGroups]);

  const reportStats = useMemo(() => {
    const totalReports = liveReports.length;
    const activePlaces = Object.keys(reportGroups).length;
    const latestReport = liveReports[0] || null;

    return {
      totalReports,
      activePlaces,
      latestReport,
    };
  }, [liveReports, reportGroups]);

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

  async function submitReport(placeId, level, options = {}) {
    const matchedPlace = places.find((place) => place.id === placeId);
    const placeName = options.placeName || matchedPlace?.name || placeId;

    await publishLiveReport({ placeId, placeName, level });
    showToast(`Live report added for ${placeName}. CrowdSense updated instantly.`);
  }

  function commitToTime(placeId, hour) {
    const halfHour = Math.round(hour * 2) / 2;
    const key = `${placeId}_${halfHour}`;
    const othersCount = 3 + Math.floor(Math.random() * 9);

    setCommitments((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));

    return { othersCount, label: formatHour(halfHour), key };
  }

  function getCommitmentCount(placeId, hour) {
    const halfHour = Math.round(hour * 2) / 2;
    const key = `${placeId}_${halfHour}`;
    return commitments[key] || 0;
  }

  function isBecomingCrowded(placeId, hour) {
    return getCommitmentCount(placeId, hour) >= 2;
  }

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
