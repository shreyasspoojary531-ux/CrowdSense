import React, { useMemo, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Compass,
  LayoutDashboard,
  MoonStar,
  PlusSquare,
  Search,
  SunMedium,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const PLACE_SUGGESTIONS = [
  { name: "Central Perk Cafe", type: "cafe", location: "5th Avenue, Midtown" },
  { name: "Riverside Library", type: "library", location: "Riverside Blvd" },
  { name: "Iron Temple Gym", type: "gym", location: "Market Street" },
  { name: "Sunset Bistro", type: "restaurant", location: "Ocean Drive" },
  { name: "Maple Mall", type: "mall", location: "Oak District" },
  { name: "Aurora Museum", type: "museum", location: "Old Town" },
  { name: "Greenway Park", type: "park", location: "Lakeview" },
  { name: "The Study Nook", type: "library", location: "West End" },
];

const TYPE_LABELS = {
  restaurant: "Restaurant",
  gym: "Gym",
  library: "Library",
  cafe: "Cafe",
  mall: "Mall",
  park: "Park",
  museum: "Museum",
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

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "report", label: "Add Report", icon: PlusSquare },
  { id: "explore", label: "Explore Places", icon: Compass },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
];

export function Sidebar({
  darkMode,
  onToggleDark,
  sidebarOpen,
  onClose,
  onImportPlace,
  importing,
  activeTab,
  onTabChange,
  liveStatus,
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredSuggestions = useMemo(() => {
    if (!normalizedQuery) {
      return PLACE_SUGGESTIONS.slice(0, 5);
    }

    return PLACE_SUGGESTIONS.filter((suggestion) => {
      const target = `${suggestion.name} ${suggestion.location} ${suggestion.type}`.toLowerCase();
      return target.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  const hasExactMatch = PLACE_SUGGESTIONS.some(
    (suggestion) => suggestion.name.toLowerCase() === normalizedQuery
  );
  const allowCustom = normalizedQuery.length > 2 && !hasExactMatch;
  const customType = allowCustom ? inferTypeFromQuery(normalizedQuery) : null;

  const suggestionsToShow = allowCustom
    ? [
      ...filteredSuggestions,
      {
        name: query.trim(),
        type: customType,
        location: "Custom import",
        custom: true,
      },
    ]
    : filteredSuggestions;

  function handleSuggestionSelect(suggestion) {
    if (!onImportPlace || importing) return;

    onImportPlace({
      name: suggestion.name,
      type: suggestion.type,
      location: suggestion.location,
    });

    setQuery(suggestion.name);
    setFocused(false);
    onTabChange("explore");
  }

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <BrandLogo />
          <div className="sidebar-status-line">
            <span className="status-dot" />
            <span>{liveStatus.modeLabel}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onTabChange(item.id);
                  onClose?.();
                }}
              >
                <Icon size={18} />
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div className="sidebar-live-card">
            <div className="sidebar-live-header">
              <Activity size={16} />
              <span>Live network</span>
            </div>
            <div className="sidebar-metric-grid">
              <div>
                <strong>{liveStatus.monitoredCount}</strong>
                <span>places</span>
              </div>
              <div>
                <strong>{liveStatus.reportCount}</strong>
                <span>reports</span>
              </div>
            </div>
          </div>

          <button type="button" className="theme-toggle" onClick={onToggleDark}>
            <span className="theme-toggle-icon">
              {darkMode ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </span>
            <span className="sidebar-label">{darkMode ? "Dark mode" : "Light mode"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
