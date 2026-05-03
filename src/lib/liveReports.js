/**
 * Live reports service layer.
 *
 * Abstracts all read/write operations for crowd reports:
 * - When Firebase is configured: uses Firestore with real-time onSnapshot listener.
 * - When Firebase is not configured: falls back to localStorage + BroadcastChannel
 *   for multi-tab synchronisation.
 *
 * Security hardening applied:
 * - Input validation (placeId, level) before any write.
 * - Firestore document fields are type-checked and validated on read — malformed
 *   documents are discarded rather than passed through to the UI.
 * - In-memory rate limiter: max 5 submissions per 60-second window per session.
 * - All Firestore calls wrapped in try/catch with graceful local fallback.
 */

import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured, realtimeCollections } from "./firebase";
import { isValidPlaceId, sanitizeReportLevel, VALID_LEVELS } from "../utils/sanitize";

// ── Constants ────────────────────────────────────────────
const LOCAL_REPORTS_KEY     = "crowdSenseRealtimeReports";
const MAX_BUFFERED_REPORTS  = 160;
const REPORT_CHANNEL        = "crowdSenseRealtimeChannel";

/** Maximum live-report submissions allowed per rate-limit window. */
const RATE_LIMIT_MAX        = 5;
/** Duration of the rate-limit window in milliseconds. */
const RATE_LIMIT_WINDOW_MS  = 60_000;

// ── Rate limiter ─────────────────────────────────────────
/** Timestamps (ms) of recent submissions — module-scoped, session-lifetime. */
const submissionTimestamps = [];

/**
 * Sliding-window rate limiter.
 * Evicts expired timestamps on each call and rejects when the window is full.
 *
 * @returns {boolean} True if the submission is allowed.
 */
function checkRateLimit() {
  const now = Date.now();
  while (
    submissionTimestamps.length > 0 &&
    now - submissionTimestamps[0] > RATE_LIMIT_WINDOW_MS
  ) {
    submissionTimestamps.shift();
  }
  if (submissionTimestamps.length >= RATE_LIMIT_MAX) return false;
  submissionTimestamps.push(now);
  return true;
}

// ── BroadcastChannel (multi-tab sync for local mode) ────
const liveChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(REPORT_CHANNEL)
    : null;

// ── Local storage helpers ────────────────────────────────

function sortReports(reports) {
  return [...reports].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

/**
 * Filter, sort, and cap a reports array.
 * Removes entries missing required fields before they reach the UI.
 */
function sanitizeReports(reports) {
  return sortReports(reports)
    .filter((r) => r?.placeId && r?.level && VALID_LEVELS.includes(r.level))
    .slice(0, MAX_BUFFERED_REPORTS);
}

function readLocalReports() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizeReports(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalReports(reports) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_REPORTS_KEY,
      JSON.stringify(sanitizeReports(reports))
    );
  } catch {
    // Ignore storage quota issues — continue operating in-memory.
  }
}

// ── Firestore normalisation ──────────────────────────────

/**
 * Convert a raw Firestore document snapshot into a typed, validated report object.
 * Returns null for documents with missing or invalid required fields so they can
 * be filtered out of the reports array before reaching the UI.
 *
 * @param {import("firebase/firestore").QueryDocumentSnapshot} docSnapshot
 * @returns {object|null}
 */
function normalizeFirestoreReport(docSnapshot) {
  const data = docSnapshot.data() || {};

  // Validate required fields before trusting Firestore data.
  const placeId = typeof data.placeId === "string" ? data.placeId.trim() : null;
  const level   = VALID_LEVELS.includes(data.level) ? data.level : null;

  if (!placeId || !level) return null;

  const createdAtMs =
    (typeof data.createdAtMs === "number" && data.createdAtMs > 0)
      ? data.createdAtMs
      : (typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : Date.now());

  return {
    id:          docSnapshot.id,
    placeId,
    placeName:   String(data.placeName || "").slice(0, 120),
    level,
    createdAtMs,
    source:      "firebase",
  };
}

// ── Public API ───────────────────────────────────────────

/**
 * Return a human-readable label for the current live sync mode.
 * @returns {"Firebase Live"|"Local Live"}
 */
export function getRealtimeModeLabel() {
  return isFirebaseConfigured ? "Firebase Live" : "Local Live";
}

// Internal subscriber set for in-tab live updates without storage events.
const localSyncSubscribers = new Set();

function notifyLocalSubscribers(reports) {
  localSyncSubscribers.forEach((cb) => cb(reports));
}

/**
 * Subscribe to live crowd reports.
 * Uses Firestore when configured; falls back to localStorage + BroadcastChannel.
 *
 * @param {(reports: object[]) => void} onReportsChange - Called whenever reports update.
 * @param {(error: Error) => void} [onError] - Called on subscription errors.
 * @returns {() => void} Cleanup / unsubscribe function.
 */
export function subscribeToLiveReports(onReportsChange, onError) {
  if (isFirebaseConfigured && db) {
    const reportsQuery = query(
      collection(db, realtimeCollections.reports),
      orderBy("createdAtMs", "desc"),
      limit(MAX_BUFFERED_REPORTS)
    );

    return onSnapshot(
      reportsQuery,
      (snapshot) => {
        // Filter out null entries from malformed Firestore documents.
        const reports = snapshot.docs
          .map(normalizeFirestoreReport)
          .filter(Boolean);
        onReportsChange(sanitizeReports(reports));
      },
      (error) => {
        onError?.(error);
      }
    );
  }

  // ── Local fallback ──
  const emitLocalReports = () => onReportsChange(readLocalReports());

  const handleStorage = (event) => {
    if (event.key === LOCAL_REPORTS_KEY) emitLocalReports();
  };

  const handleChannel = (event) => {
    if (event.data?.type === "reports-updated") emitLocalReports();
  };

  if (typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  liveChannel?.addEventListener("message", handleChannel);
  localSyncSubscribers.add(onReportsChange);

  emitLocalReports();

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("storage", handleStorage);
    liveChannel?.removeEventListener("message", handleChannel);
    localSyncSubscribers.delete(onReportsChange);
  };
}

/**
 * Publish a new crowd-level report.
 *
 * Validates all inputs and enforces a client-side rate limit before writing.
 * When Firebase is configured, writes to Firestore and falls back to local
 * storage on error. In local mode, writes directly to localStorage.
 *
 * @param {{ placeId: string, placeName: string, level: string }} payload
 * @returns {Promise<object>} The created report object.
 * @throws {Error} If the rate limit is exceeded or input is invalid.
 */
export async function publishLiveReport({ placeId, placeName, level }) {
  // ── Input validation (throws before hitting rate limiter or Firebase) ──
  if (!isValidPlaceId(placeId)) {
    throw new Error("Invalid placeId supplied to publishLiveReport.");
  }

  const safeLevel = sanitizeReportLevel(level);
  if (!safeLevel) {
    throw new Error(`Invalid report level "${level}". Must be Low, Medium, or High.`);
  }

  // ── Rate limiting ──
  if (!checkRateLimit()) {
    throw new Error("Rate limit reached. Please wait before submitting another report.");
  }

  const reportPayload = {
    placeId,
    placeName: String(placeName || "").slice(0, 120),
    level: safeLevel,
    createdAtMs: Date.now(),
  };

  // ── Firebase write ──
  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, realtimeCollections.reports), {
        ...reportPayload,
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, ...reportPayload, source: "firebase" };
    } catch (firebaseError) {
      // Firebase write failed — fall through to local storage as graceful fallback.
      console.warn(
        "[CrowdSense] Firebase write failed, using local fallback:",
        firebaseError.message
      );
    }
  }

  // ── Local fallback ──
  const localPayload = {
    id: `${reportPayload.placeId}-${reportPayload.createdAtMs}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    ...reportPayload,
    source: "local",
  };

  const nextReports = [localPayload, ...readLocalReports()];
  writeLocalReports(nextReports);
  liveChannel?.postMessage({ type: "reports-updated" });
  notifyLocalSubscribers(sanitizeReports(nextReports));

  return localPayload;
}
