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

const LOCAL_REPORTS_KEY = "crowdSenseRealtimeReports";
const MAX_BUFFERED_REPORTS = 160;
const REPORT_CHANNEL = "crowdSenseRealtimeChannel";

const liveChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(REPORT_CHANNEL)
    : null;

function sortReports(reports) {
  return [...reports].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

function sanitizeReports(reports) {
  return sortReports(reports)
    .filter((report) => report?.placeId && report?.level)
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
    window.localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(sanitizeReports(reports)));
  } catch {
    // Ignore storage quota issues and continue in-memory.
  }
}

function normalizeFirestoreReport(docSnapshot) {
  const data = docSnapshot.data() || {};
  const createdAtMs =
    data.createdAtMs ||
    (typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : 0);

  return {
    id: docSnapshot.id,
    placeId: data.placeId,
    placeName: data.placeName || "",
    level: data.level,
    createdAtMs,
    source: "firebase",
  };
}

export function getRealtimeModeLabel() {
  return isFirebaseConfigured ? "Firebase Live" : "Local Live";
}

const localSyncSubscribers = new Set();

function notifyLocalSubscribers(reports) {
  localSyncSubscribers.forEach((cb) => cb(reports));
}

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
        const reports = snapshot.docs.map(normalizeFirestoreReport);
        onReportsChange(sanitizeReports(reports));
      },
      (error) => {
        onError?.(error);
      }
    );
  }

  const emitLocalReports = () => {
    onReportsChange(readLocalReports());
  };

  const handleStorage = (event) => {
    if (event.key === LOCAL_REPORTS_KEY) {
      emitLocalReports();
    }
  };

  const handleChannel = (event) => {
    if (event.data?.type === "reports-updated") {
      emitLocalReports();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  liveChannel?.addEventListener("message", handleChannel);
  
  // Internal tab sync
  localSyncSubscribers.add(onReportsChange);
  
  emitLocalReports();

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
    liveChannel?.removeEventListener("message", handleChannel);
    localSyncSubscribers.delete(onReportsChange);
  };
}

export async function publishLiveReport({ placeId, placeName, level }) {
  const payload = {
    placeId,
    placeName,
    level,
    createdAtMs: Date.now(),
  };

  if (isFirebaseConfigured && db) {
    const docRef = await addDoc(collection(db, realtimeCollections.reports), {
      ...payload,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...payload,
      source: "firebase",
    };
  }

  const localPayload = {
    id: `${payload.placeId}-${payload.createdAtMs}-${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
    source: "local",
  };

  const nextReports = [localPayload, ...readLocalReports()];
  writeLocalReports(nextReports);
  liveChannel?.postMessage({ type: "reports-updated" });
  
  // Instant notification for the current tab
  notifyLocalSubscribers(sanitizeReports(nextReports));

  return localPayload;
}
