import React, { useMemo, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Compass,
  LayoutDashboard,
  Map,
  MoonStar,
  PlusSquare,
  SunMedium,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import {
  PLACE_SUGGESTIONS,
  TYPE_LABELS,
  inferTypeFromQuery,
} from "../data/suggestions";

/** Navigation items rendered in the sidebar. */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "report", label: "Add Report", icon: PlusSquare },
  { id: "explore", label: "Explore Places", icon: Compass },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { id: "map", label: "Map", icon: Map },
];

/**
 * Collapsible sidebar with logo, primary navigation, venue import search,
 * live network stats, and dark-mode toggle.
 *
 * Accessibility:
 * - `aria-current="page"` marks the active nav item.
 * - The sidebar `<aside>` carries an id so the hamburger button can reference
 *   it via `aria-controls`.
 */
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
    if (!normalizedQuery) return PLACE_SUGGESTIONS.slice(0, 5);
    return PLACE_SUGGESTIONS.filter((s) => {
      const target = `${s.name} ${s.location} ${s.type}`.toLowerCase();
      return target.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  const hasExactMatch = PLACE_SUGGESTIONS.some(
    (s) => s.name.toLowerCase() === normalizedQuery
  );
  const allowCustom = normalizedQuery.length > 2 && !hasExactMatch;
  const customType = allowCustom ? inferTypeFromQuery(normalizedQuery) : null;

  const suggestionsToShow = allowCustom
    ? [
        ...filteredSuggestions,
        { name: query.trim(), type: customType, location: "Custom import", custom: true },
      ]
    : filteredSuggestions;

  function handleSuggestionSelect(suggestion) {
    if (!onImportPlace || importing) return;
    onImportPlace({ name: suggestion.name, type: suggestion.type, location: suggestion.location });
    setQuery(suggestion.name);
    setFocused(false);
    onTabChange("explore");
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-top">
          <BrandLogo />
          <div className="sidebar-status-line" aria-label={`Live mode: ${liveStatus.modeLabel}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{liveStatus.modeLabel}</span>
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  onTabChange(item.id);
                  onClose?.();
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        {/* Footer — live stats + dark mode toggle */}
        <div className="sidebar-footer">
          <div className="sidebar-live-card" aria-label="Live network stats">
            <div className="sidebar-live-header">
              <Activity size={16} aria-hidden="true" />
              <span>Live network</span>
            </div>
            <dl className="sidebar-metric-grid">
              <div>
                <strong>{liveStatus.monitoredCount}</strong>
                <span>places</span>
              </div>
              <div>
                <strong>{liveStatus.reportCount}</strong>
                <span>reports</span>
              </div>
            </dl>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleDark}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={darkMode}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {darkMode ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </span>
            <span className="sidebar-label">{darkMode ? "Dark mode" : "Light mode"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
