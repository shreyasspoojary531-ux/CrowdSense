import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Compass,
  Menu,
  PlusSquare,
  Radar,
  RadioTower,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { PLACES, CATEGORIES } from "./data/places";
import { useCrowdState } from "./hooks/useCrowdState";
import { PlaceCard } from "./components/PlaceCard";
import { PlaceDetail } from "./components/PlaceDetail";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { PredictionChart } from "./components/PredictionChart";
import { QuickReportPanel } from "./components/QuickReportPanel";
import { LiveReportFeed } from "./components/LiveReportFeed";

const IMPORT_STORAGE_KEY = "crowdSenseImportedPlaces";

const PLACE_TYPE_CONFIG = {
  restaurant: {
    label: "Restaurant",
    category: "food",
    icon: "🍽️",
    peakHours: [[11, 14]],
    baseCapacity: 120,
  },
  gym: {
    label: "Gym",
    category: "fitness",
    icon: "🏋️",
    peakHours: [[17, 21]],
    baseCapacity: 90,
  },
  library: {
    label: "Library",
    category: "study",
    icon: "📚",
    peakHours: [[13, 17]],
    baseCapacity: 160,
  },
  cafe: {
    label: "Cafe",
    category: "food",
    icon: "☕",
    peakHours: [[8, 10], [15, 17]],
    baseCapacity: 70,
  },
  mall: {
    label: "Mall",
    category: "shopping",
    icon: "🏬",
    peakHours: [[12, 15], [17, 21]],
    baseCapacity: 700,
  },
  park: {
    label: "Park",
    category: "all",
    icon: "🌳",
    peakHours: [[7, 10], [16, 19]],
    baseCapacity: 300,
  },
  museum: {
    label: "Museum",
    category: "all",
    icon: "🏛️",
    peakHours: [[11, 14]],
    baseCapacity: 220,
  },
};

function inferTypeFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes("gym") || q.includes("fitness")) return "gym";
  if (q.includes("library") || q.includes("book")) return "library";
  if (q.includes("cafe") || q.includes("coffee")) return "cafe";
  if (q.includes("mall") || q.includes("plaza")) return "mall";
  if (q.includes("park") || q.includes("garden")) return "park";
  if (q.includes("museum") || q.includes("gallery")) return "museum";
  if (q.includes("restaurant") || q.includes("diner") || q.includes("eatery")) return "restaurant";
  return "restaurant";
}

function buildImportedPlace({ name, type, location }) {
  const safeName = name.trim();
  const resolvedType = type || inferTypeFromQuery(safeName);
  const config = PLACE_TYPE_CONFIG[resolvedType] || PLACE_TYPE_CONFIG.restaurant;
  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const capacityVariance = Math.floor(Math.random() * 60);

  return {
    id: `import-${slug || "place"}-${Date.now()}`,
    name: safeName,
    icon: config.icon,
    category: config.category,
    description: `Imported ${config.label} prediction`,
    location: location || "User imported location",
    capacity: config.baseCapacity + capacityVariance,
    peakHours: config.peakHours,
    type: resolvedType,
    source: "import",
  };
}

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
};

function MetricCard({ icon, label, value, tone = "default" }) {
  const IconComponent = icon;

  return (
    <div className={`glass-card metric-card tone-${tone}`}>
      <div className="metric-card-icon">
        <IconComponent size={18} />
      </div>
      <div className="metric-card-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function App() {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [category, setCategory] = useState("all");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analyticsPlaceId, setAnalyticsPlaceId] = useState("");
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
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const allPlaces = useMemo(() => [...PLACES, ...importedPlaces], [importedPlaces]);
  const crowdState = useCrowdState(allPlaces);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const crowds = useMemo(
    () =>
      allPlaces.map((place) => ({
        place,
        crowd: crowdState.getCrowd(place),
      })),
    [allPlaces, crowdState]
  );

  const filteredCrowds = useMemo(
    () => crowds.filter(({ place }) => (category === "all" ? true : place.category === category)),
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
    return Math.round(crowds.reduce((sum, item) => sum + item.crowd.percent, 0) / crowds.length);
  }, [crowds]);

  const analyticsCandidates = useMemo(() => allPlaces, [allPlaces]);
  const resolvedAnalyticsPlaceId = analyticsPlaceId || analyticsCandidates[0]?.id || allPlaces[0]?.id || "";
  const analyticsPlace = useMemo(
    () =>
      allPlaces.find((place) => place.id === resolvedAnalyticsPlaceId) ||
      analyticsCandidates[0] ||
      allPlaces[0] ||
      null,
    [allPlaces, analyticsCandidates, resolvedAnalyticsPlaceId]
  );

  const analyticsDetail = analyticsPlace ? crowdState.getDetail(analyticsPlace) : null;
  const globalLiveReports = crowdState.liveReports.slice(0, 6);
  const liveStatus = {
    modeLabel: crowdState.realtimeModeLabel,
    monitoredCount: allPlaces.length,
    reportCount: crowdState.reportStats.totalReports,
  };

  function handleSelectPlace(place) {
    setSelectedPlace(place);
    setActiveTab("explore");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImportPlace(placeDraft) {
    const trimmedName = (placeDraft?.name || "").trim();
    if (!trimmedName) return;

    const existing = allPlaces.find(
      (place) => place.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      setSelectedPlace(existing);
      crowdState.showToast("Place already added. Opening the live detail view.");
      return;
    }

    setImporting(true);
    setImportStatus("Mapping venue profile and creating live prediction...");

    window.setTimeout(() => {
      const newPlace = buildImportedPlace(placeDraft);

      setImportedPlaces((prev) => {
        const next = [...prev, newPlace];
        try {
          localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage failures.
        }
        return next;
      });

      setSelectedPlace(newPlace);
      setActiveTab("explore");
      setImporting(false);
      setImportStatus("");
      crowdState.showToast(`Imported ${newPlace.name}. CrowdSense is tracking it now.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 900);
  }

  function renderDashboard() {
    return (
      <div className="page-stack">
        <section className="glass-card hero-panel animate-fade-up">
          <div className="hero-copy">
            <div className="section-kicker">CrowdSense live system</div>
            <h1>
              Crowd timing that feels
              <span className="gradient-text"> live, branded, and production-ready.</span>
            </h1>
            <p>
              Watch live reports reshape the smart average, identify the quietest options, and move
              through places with realtime confidence.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn-primary hero-primary" onClick={() => setActiveTab("report")}>
                <PlusSquare size={16} />
                <span>Add a live report</span>
              </button>
              <button type="button" className="btn-secondary hero-secondary" onClick={() => setActiveTab("explore")}>
                <Compass size={16} />
                <span>Explore places</span>
              </button>
            </div>
          </div>

          <div className="hero-aside">
            <div className="hero-live-chip">
              <span className="status-dot" />
              <span>{crowdState.realtimeModeLabel}</span>
            </div>
            <div className="hero-signal-grid">
              <div>
                <strong>{liveStatus.reportCount}</strong>
                <span>shared live reports</span>
              </div>
              <div>
                <strong>{avgCapacity}%</strong>
                <span>average current load</span>
              </div>
              <div>
                <strong>{quietPlaces.length}</strong>
                <span>recommended right now</span>
              </div>
            </div>
          </div>
        </section>

        <section className="metric-grid">
          <MetricCard icon={Activity} label="Monitored places" value={allPlaces.length} tone="orange" />
          <MetricCard icon={RadioTower} label="Live reports buffered" value={crowdState.reportStats.totalReports} tone="orange" />
          <MetricCard icon={Compass} label="Quiet spots right now" value={crowds.filter((item) => item.crowd.level === "Low").length} tone="orange" />
          <MetricCard icon={TrendingUp} label="Network average load" value={`${avgCapacity}%`} tone="orange" />
        </section>

        <section className="dashboard-split">
          <div className="glass-card signal-panel">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Go now</div>
                <h3>Best places at this moment</h3>
                <p>These venues currently have the softest crowd pressure across the network.</p>
              </div>
            </div>

            <div className="signal-list">
              {quietPlaces.map(({ place, crowd }) => (
                <button
                  key={place.id}
                  type="button"
                  className="signal-item"
                  onClick={() => handleSelectPlace(place)}
                >
                  <div>
                    <strong>{place.name}</strong>
                    <span>{place.location}</span>
                  </div>
                  <div className="signal-item-meta">
                    <span>{crowd.percent}%</span>
                    <ArrowUpRight size={15} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <LiveReportFeed
            reports={globalLiveReports}
            title="Network activity"
            subtitle="Fresh reports are recalculating capacity and graph data across the app."
          />
        </section>

        <section className="dashboard-card-grid">
          {quietPlaces.concat(busyPlaces.slice(0, 2)).map(({ place, crowd }) => (
            <PlaceCard key={place.id} place={place} crowd={crowd} onClick={() => handleSelectPlace(place)} />
          ))}
        </section>
      </div>
    );
  }

  function renderReportTab() {
    return (
      <div className="page-stack">
        <QuickReportPanel
          places={allPlaces}
          crowdState={crowdState}
          initialPlaceId={analyticsPlace?.id}
          onOpenPlace={handleSelectPlace}
        />
        <LiveReportFeed
          reports={globalLiveReports}
          title="Latest system updates"
          subtitle="Each new report updates capacity percentages, cards, and charts in realtime."
        />
      </div>
    );
  }

  function renderExplore() {
    return (
      <div className="page-stack">
        <div className="filter-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill ${category === cat.id ? "active" : ""}`}
              onClick={() => setCategory(cat.id)}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="explore-grid">
          {filteredCrowds.map(({ place, crowd }) => (
            <PlaceCard key={place.id} place={place} crowd={crowd} onClick={() => handleSelectPlace(place)} />
          ))}
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    return (
      <div className="page-stack">
        <section className="metric-grid">
          <MetricCard icon={Radar} label="Live sync mode" value={crowdState.realtimeModeLabel} tone="orange" />
          <MetricCard icon={Sparkles} label="Quietest place" value={quietPlaces[0]?.place.name || "N/A"} tone="orange" />
          <MetricCard icon={TrendingUp} label="Busiest place" value={busyPlaces[0]?.place.name || "N/A"} tone="orange" />
          <MetricCard icon={RadioTower} label="Active report places" value={crowdState.reportStats.activePlaces} tone="orange" />
        </section>

        <section className="analytics-layout">
          <div className="analytics-main">
            <div className="glass-card analytics-switcher">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">Forecast focus</div>
                  <h3>Compare live hotspots</h3>
                  <p>Select a place to inspect its live forecast and recent report blend.</p>
                </div>
              </div>

              <div className="switcher-row">
                {analyticsCandidates.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className={`switcher-pill ${analyticsPlace?.id === place.id ? "active" : ""}`}
                    onClick={() => setAnalyticsPlaceId(place.id)}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
            </div>

            {analyticsDetail && analyticsPlace && (
              <PredictionChart
                data={analyticsDetail.prediction}
                title={`${analyticsPlace.name} live forecast`}
                subtitle={`Using the latest ${crowdState.getReportSummary(analyticsPlace.id)?.sampleSize || 0} reports to shape the next three hours.`}
              />
            )}
          </div>

          <div className="analytics-side">
            <div className="glass-card leaderboard-card">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">Pressure map</div>
                  <h3>Most crowded now</h3>
                  <p>Realtime capacity ordering across the top active venues.</p>
                </div>
              </div>
              <div className="leaderboard-list">
                {busyPlaces.map(({ place, crowd }) => (
                  <button
                    key={place.id}
                    type="button"
                    className="leaderboard-item"
                    onClick={() => handleSelectPlace(place)}
                  >
                    <div>
                      <strong>{place.name}</strong>
                      <span>{crowd.wait} wait</span>
                    </div>
                    <strong>{crowd.percent}%</strong>
                  </button>
                ))}
              </div>
            </div>

            <LiveReportFeed
              reports={globalLiveReports}
              title="Realtime report log"
              subtitle="Track the latest signal changes powering the analytics layer."
            />
          </div>
        </section>
      </div>
    );
  }

  const currentMeta = selectedPlace
    ? {
        title: selectedPlace.name,
        subtitle: "Live venue detail, smart averaging, and realtime report feedback.",
      }
    : TAB_META[activeTab];

  return (
    <div className="app-layout">
      <Sidebar
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((value) => !value)}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onImportPlace={handleImportPlace}
        importing={importing}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        liveStatus={liveStatus}
      />

      <main className="main-content">
        <header className="nav-bar">
          <div className="nav-inner">
            <div className="nav-heading">
              <button
                type="button"
                className="hamburger"
                onClick={() => setSidebarOpen((value) => !value)}
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h2>{currentMeta.title}</h2>
                <p>{currentMeta.subtitle}</p>
              </div>
            </div>

            <div className="nav-actions" style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end', marginLeft: '20px'}}>
              <SearchBar onImportPlace={handleImportPlace} importing={importing} onTabChange={setActiveTab} />
              <div className="live-pill">
                <span className="status-dot" />
                <span>{crowdState.realtimeModeLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-shell">
          {importing && (
            <div className="import-banner animate-slide-in">
              <span className="status-dot" />
              <span>{importStatus}</span>
            </div>
          )}

          {selectedPlace ? (
            <PlaceDetail place={selectedPlace} crowdState={crowdState} onBack={() => setSelectedPlace(null)} />
          ) : (
            <>
              {activeTab === "dashboard" && renderDashboard()}
              {activeTab === "report" && renderReportTab()}
              {activeTab === "explore" && renderExplore()}
              {activeTab === "analytics" && renderAnalytics()}
            </>
          )}
        </div>
      </main>

      {crowdState.toast && <div className="toast">{crowdState.toast}</div>}
    </div>
  );
}

export default App;


