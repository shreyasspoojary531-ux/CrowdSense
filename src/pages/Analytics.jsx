import React, { lazy, memo, Suspense } from "react";
import { Radar, RadioTower, Sparkles, TrendingUp } from "lucide-react";
import { MetricCard } from "../components/common/MetricCard";
import { LiveReportFeed } from "../components/LiveReportFeed";

/**
 * Lazy-load PredictionChart so recharts (a heavy library) is only fetched when
 * the Analytics tab is first opened, keeping the initial bundle lean.
 */
const PredictionChart = lazy(() =>
  import("../components/PredictionChart").then((m) => ({ default: m.PredictionChart }))
);

const CHART_FALLBACK = (
  <div
    className="glass-card chart-card"
    style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}
  >
    <p style={{ color: "var(--color-text-soft)" }}>Loading chart…</p>
  </div>
);

/**
 * Analytics page — crowd forecast charts and realtime leaderboard.
 *
 * Uses lazy-loaded PredictionChart so recharts is code-split away from the
 * main bundle and only loaded when this tab is first visited.
 */
export const Analytics = memo(function Analytics({
  quietPlaces,
  busyPlaces,
  analyticsCandidates,
  analyticsPlace,
  analyticsDetail,
  onSelectAnalyticsPlace,
  crowdState,
  globalLiveReports,
  onSelectPlace,
}) {
  return (
    <div className="page-stack">
      {/* ── Metric cards ── */}
      <section className="metric-grid" aria-label="Analytics metrics">
        <MetricCard icon={Radar} label="Live sync mode" value={crowdState.realtimeModeLabel} tone="orange" />
        <MetricCard icon={Sparkles} label="Quietest place" value={quietPlaces[0]?.place.name || "N/A"} tone="orange" />
        <MetricCard icon={TrendingUp} label="Busiest place" value={busyPlaces[0]?.place.name || "N/A"} tone="orange" />
        <MetricCard icon={RadioTower} label="Active report places" value={crowdState.reportStats.activePlaces} tone="orange" />
      </section>

      {/* ── Main analytics layout ── */}
      <section className="analytics-layout">
        <div className="analytics-main">
          {/* Place switcher */}
          <div className="glass-card analytics-switcher">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Forecast focus</div>
                <h2>Compare live hotspots</h2>
                <p>Select a place to inspect its live forecast and recent report blend.</p>
              </div>
            </div>

            <div
              className="switcher-row"
              role="group"
              aria-label="Select venue for analytics"
            >
              {analyticsCandidates.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className={`switcher-pill ${analyticsPlace?.id === place.id ? "active" : ""}`}
                  onClick={() => onSelectAnalyticsPlace(place.id)}
                  aria-pressed={analyticsPlace?.id === place.id}
                >
                  {place.name}
                </button>
              ))}
            </div>
          </div>

          {/* Live forecast chart — lazily loaded */}
          {analyticsDetail && analyticsPlace && (
            <Suspense fallback={CHART_FALLBACK}>
              <PredictionChart
                data={analyticsDetail.prediction}
                title={`${analyticsPlace.name} live forecast`}
                subtitle={`Using the latest ${
                  crowdState.getReportSummary(analyticsPlace.id)?.sampleSize || 0
                } reports to shape the next three hours.`}
              />
            </Suspense>
          )}
        </div>

        {/* ── Side panel ── */}
        <div className="analytics-side">
          <div className="glass-card leaderboard-card" aria-labelledby="leaderboard-heading">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Pressure map</div>
                <h2 id="leaderboard-heading">Most crowded now</h2>
                <p>Realtime capacity ordering across the top active venues.</p>
              </div>
            </div>
            <ul className="leaderboard-list" role="list">
              {busyPlaces.map(({ place, crowd }) => (
                <li key={place.id} role="listitem">
                  <button
                    type="button"
                    className="leaderboard-item"
                    onClick={() => onSelectPlace(place)}
                    aria-label={`${place.name} — ${crowd.percent}% capacity, ${crowd.wait} wait`}
                  >
                    <div>
                      <strong>{place.name}</strong>
                      <span>{crowd.wait} wait</span>
                    </div>
                    <strong>{crowd.percent}%</strong>
                  </button>
                </li>
              ))}
            </ul>
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
});
