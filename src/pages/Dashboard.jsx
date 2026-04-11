import React, { memo } from "react";
import {
  Activity,
  ArrowUpRight,
  Compass,
  PlusSquare,
  RadioTower,
  TrendingUp,
} from "lucide-react";
import { PlaceCard } from "../components/PlaceCard";
import { LiveReportFeed } from "../components/LiveReportFeed";
import { MetricCard } from "../components/common/MetricCard";
import { TypewriterText } from "../components/common/TypewriterText";

/** Words cycled by the hero typewriter animation. */
const TYPEWRITER_WORDS = ["Move Smarter", "See it Happen"];

/**
 * Dashboard page — high-level overview of live crowd intelligence.
 *
 * Renders the hero section, key metrics, the "best places now" signal panel,
 * the global live report feed, and a featured place card grid.
 *
 * All heavy data (crowds, sorted lists, averages) is computed and memoised
 * in the parent App component and passed in as props to keep this component
 * a pure, fast renderer.
 */
export const Dashboard = memo(function Dashboard({
  crowds,
  quietPlaces,
  busyPlaces,
  avgCapacity,
  allPlaces,
  liveStatus,
  globalLiveReports,
  realtimeModeLabel,
  reportStats,
  onSelectPlace,
  onTabChange,
}) {
  const quietCount = crowds.filter((item) => item.crowd.level === "Low").length;

  return (
    <div className="page-stack">
      {/* ── Hero ── */}
      <section className="glass-card hero-panel animate-fade-up" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <div className="section-kicker">CrowdSense live system</div>
          <h1 id="hero-heading">
            Your decisions shape
            <span className="gradient-text">
              {" "}Crowd in Realtime ,{" "}
              <br />
              <TypewriterText words={TYPEWRITER_WORDS} />
            </span>
          </h1>
          <p>
            Watch live reports reshape the smart average, identify the quietest options, and move
            through places with realtime confidence.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary hero-primary"
              onClick={() => onTabChange("report")}
            >
              <PlusSquare size={16} aria-hidden="true" />
              <span>Add a live report</span>
            </button>
            <button
              type="button"
              className="btn-secondary hero-secondary"
              onClick={() => onTabChange("explore")}
            >
              <Compass size={16} aria-hidden="true" />
              <span>Explore places</span>
            </button>
          </div>
        </div>

        <div className="hero-aside">
          <div className="hero-live-chip" aria-label={`Live mode: ${realtimeModeLabel}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{realtimeModeLabel}</span>
          </div>
          <dl className="hero-signal-grid" aria-label="Live network statistics">
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
          </dl>
        </div>
      </section>

      {/* ── Key Metrics ── */}
      <section className="metric-grid" aria-label="Key metrics">
        <MetricCard icon={Activity} label="Monitored places" value={allPlaces.length} tone="orange" />
        <MetricCard icon={RadioTower} label="Live reports buffered" value={reportStats.totalReports} tone="orange" />
        <MetricCard icon={Compass} label="Quiet spots right now" value={quietCount} tone="orange" />
        <MetricCard icon={TrendingUp} label="Network average load" value={`${avgCapacity}%`} tone="orange" />
      </section>

      {/* ── Signal Panel + Feed ── */}
      <section className="dashboard-split">
        <div className="glass-card signal-panel" aria-labelledby="best-places-heading">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Go now</div>
              <h2 id="best-places-heading">Best places at this moment</h2>
              <p>These venues currently have the softest crowd pressure across the network.</p>
            </div>
          </div>

          <ul className="signal-list" role="list" aria-label="Quietest venues right now">
            {quietPlaces.map(({ place, crowd }) => (
              <li key={place.id} role="listitem">
                <button
                  type="button"
                  className="signal-item"
                  onClick={() => onSelectPlace(place)}
                  aria-label={`${place.name} — ${crowd.percent}% capacity, ${crowd.wait} wait`}
                >
                  <div>
                    <strong>{place.name}</strong>
                    <span>{place.location}</span>
                  </div>
                  <div className="signal-item-meta">
                    <span>{crowd.percent}%</span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <LiveReportFeed
          reports={globalLiveReports}
          title="Network activity"
          subtitle="Fresh reports are recalculating capacity and graph data across the app."
        />
      </section>

      {/* ── Featured Place Cards ── */}
      <section className="dashboard-card-grid" aria-label="Featured venues">
        {quietPlaces.concat(busyPlaces.slice(0, 2)).map(({ place, crowd }) => (
          <PlaceCard
            key={place.id}
            place={place}
            crowd={crowd}
            onClick={() => onSelectPlace(place)}
          />
        ))}
      </section>
    </div>
  );
});
