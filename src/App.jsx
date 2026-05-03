/**
 * App.jsx — application root shell.
 *
 * Responsibilities:
 * - Global state (selected place, tab, dark mode, sidebar, imported places)
 * - Derived crowd data via memoised selectors
 * - Route rendering via tab state (lazy-loaded page components)
 * - Passes sanitised data down to pages and components
 *
 * What is NOT here (compared to the original 619-line file):
 * - MetricCard, TypewriterText  → src/components/common/
 * - renderDashboard/Explore/Analytics/ReportTab → src/pages/
 * - PLACE_TYPE_CONFIG, buildImportedPlace → src/utils/reportUtils.js
 * - inferTypeFromQuery → src/data/suggestions.js
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PLACES } from "./data/places";
import { useCrowdState } from "./hooks/useCrowdState";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { PlaceDetail } from "./components/PlaceDetail";
import { Toast } from "./components/common/Toast";
import { buildImportedPlace } from "./utils/reportUtils";
import { sanitizePlaceName } from "./utils/sanitize";
import { pageVariant } from "./components/motion/variants";

// ── Lazy-loaded pages (code-split by route) ──────────────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const ReportTab  = lazy(() => import("./pages/ReportTab").then((m) => ({ default: m.ReportTab })));
const Explore    = lazy(() => import("./pages/Explore").then((m) => ({ default: m.Explore })));
const Analytics  = lazy(() => import("./pages/Analytics").then((m) => ({ default: m.Analytics })));
const MapView    = lazy(() => import("./pages/MapView").then((m) => ({ default: m.MapView })));

/** Skeleton fallback shown while a lazy page chunk is loading. */
const PAGE_FALLBACK = (
  <div className="page-skeleton" role="status" aria-live="polite" aria-label="Loading page">
    <div className="skeleton-hero" />
    <div className="skeleton-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ "--i": i }} />
      ))}
    </div>
    <div className="skeleton-block" style={{ height: 180, borderRadius: 20 }} />
  </div>
);

/** Storage key for persisting user-imported places across sessions. */
const IMPORT_STORAGE_KEY = "crowdSenseImportedPlaces";

/** Header meta for each primary tab. */
const TAB_META = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Realtime crowd intelligence across your monitored places.",
  },
  report: {
    title: "Add Report",
    subtitle: "Broadcast live observations and refresh CrowdSense instantly.",
  },
  explore: {
    title: "Explore Places",
    subtitle: "Browse every venue and jump into detailed live insights.",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Watch the live graph shift as reports and intent roll in.",
  },
  map: {
    title: "Map",
    subtitle: "Search and explore places on an interactive OpenStreetMap.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // ── UI state ──
  const [selectedPlace, setSelectedPlace]   = useState(null);
  const [category, setCategory]             = useState("all");
  const [darkMode, setDarkMode]             = useState(true);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [activeTab, setActiveTab]           = useState("dashboard");
  const [analyticsPlaceId, setAnalyticsPlaceId] = useState("");
  const [importing, setImporting]           = useState(false);
  const [importStatus, setImportStatus]     = useState("");

  // ── Persisted imported places ──
  const [importedPlaces, setImportedPlaces] = useState(() => {
    try {
      const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const allPlaces = useMemo(() => [...PLACES, ...importedPlaces], [importedPlaces]);
  const crowdState = useCrowdState(allPlaces);

  // Apply dark mode class to root element.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // ── Stable callbacks ──────────────────────────────────────────────────────

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSelectedPlace(null);
  }, []);

  const handleSelectPlace = useCallback((place) => {
    setSelectedPlace(place);
    setActiveTab("explore");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleImportPlace = useCallback(
    async (placeDraft) => {
      const trimmedName = sanitizePlaceName(placeDraft?.name || "");
      if (!trimmedName) return;

      const existing = allPlaces.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        setSelectedPlace(existing);
        crowdState.showToast("Place already added. Opening the live detail view.");
        return;
      }

      setImporting(true);
      setImportStatus("Mapping venue profile and creating live prediction…");

      let lat = placeDraft.lat ?? null;
      let lng = placeDraft.lng ?? null;

      if (lat == null || lng == null) {
        setImportStatus("Locating on map…");
        const geoController = new AbortController();
        const geoTimeout    = window.setTimeout(() => geoController.abort(), 6_000);
        try {
          const q = [trimmedName, sanitizePlaceName(placeDraft.location || "")]
            .filter(Boolean)
            .join(" ");
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
            { headers: { "Accept-Language": "en" }, signal: geoController.signal }
          );
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        } catch {
          // Geocoding failed or timed out — place tracked without a map pin.
        } finally {
          window.clearTimeout(geoTimeout);
        }
        setImportStatus("Building live prediction model…");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 700));

      const newPlace = buildImportedPlace({
        name: trimmedName,
        type: placeDraft.type,
        location: sanitizePlaceName(placeDraft.location || ""),
        lat,
        lng,
      });

      setImportedPlaces((prev) => {
        const next = [...prev, newPlace];
        try {
          localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota failures — operate in-memory.
        }
        return next;
      });

      setSelectedPlace(newPlace);
      setActiveTab("explore");
      setImporting(false);
      setImportStatus("");
      crowdState.showToast(
        lat != null
          ? `${newPlace.name} added and pinned on the map.`
          : `${newPlace.name} imported. CrowdSense is now tracking it.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [allPlaces, crowdState]
  );

  // ── Derived crowd data (all memoised) ─────────────────────────────────────

  const crowds = useMemo(
    () => allPlaces.map((place) => ({ place, crowd: crowdState.getCrowd(place) })),
    [allPlaces, crowdState]
  );

  const filteredCrowds = useMemo(
    () => crowds.filter(({ place }) => category === "all" || place.category === category),
    [category, crowds]
  );

  const quietPlaces = useMemo(
    () => [...crowds].sort((a, b) => a.crowd.percent - b.crowd.percent).slice(0, 4),
    [crowds]
  );

  const busyPlaces = useMemo(
    () => [...crowds].sort((a, b) => b.crowd.percent - a.crowd.percent).slice(0, 4),
    [crowds]
  );

  const avgCapacity = useMemo(() => {
    if (crowds.length === 0) return 0;
    return Math.round(crowds.reduce((sum, i) => sum + i.crowd.percent, 0) / crowds.length);
  }, [crowds]);

  const analyticsCandidates = useMemo(() => allPlaces, [allPlaces]);

  const analyticsPlace = useMemo(
    () =>
      allPlaces.find((p) => p.id === (analyticsPlaceId || analyticsCandidates[0]?.id)) ||
      analyticsCandidates[0] ||
      null,
    [allPlaces, analyticsCandidates, analyticsPlaceId]
  );

  const analyticsDetail = useMemo(
    () => (analyticsPlace ? crowdState.getDetail(analyticsPlace) : null),
    [analyticsPlace, crowdState]
  );

  const globalLiveReports = useMemo(
    () => crowdState.liveReports.slice(0, 6),
    [crowdState.liveReports]
  );

  const liveStatus = useMemo(
    () => ({
      modeLabel: crowdState.realtimeModeLabel,
      monitoredCount: allPlaces.length,
      reportCount: crowdState.reportStats.totalReports,
    }),
    [crowdState.realtimeModeLabel, allPlaces.length, crowdState.reportStats.totalReports]
  );

  // ── Header meta ───────────────────────────────────────────────────────────

  const currentMeta = selectedPlace
    ? {
        title: selectedPlace.name,
        subtitle: "Live venue detail, smart averaging, and realtime report feedback.",
      }
    : TAB_META[activeTab];

  /** Key that uniquely identifies the current view — drives AnimatePresence. */
  const viewKey = selectedPlace ? `place-${selectedPlace.id}` : activeTab;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <Sidebar
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((v) => !v)}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onImportPlace={handleImportPlace}
        importing={importing}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        liveStatus={liveStatus}
      />

      <main className="main-content">
        <header className="nav-bar">
          <div className="nav-inner">
            <div className="nav-heading">
              <button
                type="button"
                className="hamburger"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
                aria-controls="app-sidebar"
              >
                {sidebarOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </button>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={viewKey}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2>{currentMeta.title}</h2>
                  <p>{currentMeta.subtitle}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div
              className="nav-actions"
              style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, justifyContent: "flex-end", marginLeft: "20px" }}
            >
              <SearchBar
                onImportPlace={handleImportPlace}
                importing={importing}
                onTabChange={setActiveTab}
              />
              <div
                className="live-pill"
                aria-label={`Live sync mode: ${crowdState.realtimeModeLabel}`}
              >
                <span className="status-dot" aria-hidden="true" />
                <span>{crowdState.realtimeModeLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-shell">
          {/* Import progress banner */}
          <AnimatePresence>
            {importing && (
              <motion.div
                className="import-banner"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="status-dot" aria-hidden="true" />
                <span>{importStatus}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main content area — keyed page transitions */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              variants={pageVariant}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ width: "100%" }}
            >
              {selectedPlace ? (
                <PlaceDetail
                  place={selectedPlace}
                  crowdState={crowdState}
                  onBack={() => setSelectedPlace(null)}
                />
              ) : (
                <Suspense fallback={PAGE_FALLBACK}>
                  {activeTab === "dashboard" && (
                    <Dashboard
                      crowds={crowds}
                      quietPlaces={quietPlaces}
                      busyPlaces={busyPlaces}
                      avgCapacity={avgCapacity}
                      allPlaces={allPlaces}
                      liveStatus={liveStatus}
                      globalLiveReports={globalLiveReports}
                      realtimeModeLabel={crowdState.realtimeModeLabel}
                      reportStats={crowdState.reportStats}
                      onSelectPlace={handleSelectPlace}
                      onTabChange={handleTabChange}
                    />
                  )}
                  {activeTab === "report" && (
                    <ReportTab
                      allPlaces={allPlaces}
                      crowdState={crowdState}
                      analyticsPlace={analyticsPlace}
                      globalLiveReports={globalLiveReports}
                      onOpenPlace={handleSelectPlace}
                    />
                  )}
                  {activeTab === "explore" && (
                    <Explore
                      filteredCrowds={filteredCrowds}
                      category={category}
                      onCategoryChange={setCategory}
                      onSelectPlace={handleSelectPlace}
                    />
                  )}
                  {activeTab === "analytics" && (
                    <Analytics
                      quietPlaces={quietPlaces}
                      busyPlaces={busyPlaces}
                      analyticsCandidates={analyticsCandidates}
                      analyticsPlace={analyticsPlace}
                      analyticsDetail={analyticsDetail}
                      analyticsPlaceId={analyticsPlaceId}
                      onSelectAnalyticsPlace={setAnalyticsPlaceId}
                      crowdState={crowdState}
                      globalLiveReports={globalLiveReports}
                      onSelectPlace={handleSelectPlace}
                    />
                  )}
                  {activeTab === "map" && (
                    <MapView
                      onImportPlace={handleImportPlace}
                      importing={importing}
                      crowds={crowds}
                      onSelectPlace={handleSelectPlace}
                    />
                  )}
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Accessible toast notification */}
      <Toast message={crowdState.toast} />
    </div>
  );
}

export default App;
