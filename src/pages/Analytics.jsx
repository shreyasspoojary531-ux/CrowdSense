import React, { lazy, memo, Suspense } from "react";
import { Radar, RadioTower, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { MetricCard } from "../components/common/MetricCard";
import { LiveReportFeed } from "../components/LiveReportFeed";
import { fadeUp, staggerContainer } from "../components/motion/variants";

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
    <motion.div
      className="page-stack"
      variants={staggerContainer(0.09, 0)}
      initial="hidden"
      animate="show"
    >
      {/* ── Metric cards ── */}
      <motion.section
        className="metric-grid"
        aria-label="Analytics metrics"
        variants={staggerContainer(0.07, 0.04)}
      >
        <MetricCard icon={Radar}      label="Live sync mode"        value={crowdState.realtimeModeLabel}              tone="orange" />
        <MetricCard icon={Sparkles}   label="Quietest place"        value={quietPlaces[0]?.place.name || "N/A"}       tone="orange" />
        <MetricCard icon={TrendingUp} label="Busiest place"         value={busyPlaces[0]?.place.name || "N/A"}        tone="orange" />
        <MetricCard icon={RadioTower} label="Active report places"  value={crowdState.reportStats.activePlaces}       tone="orange" />
      </motion.section>

      {/* ── Main analytics layout ── */}
      <motion.section className="analytics-layout" variants={fadeUp}>
        <div className="analytics-main">
          {/* Place switcher */}
          <motion.div className="glass-card analytics-switcher" variants={fadeUp}>
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
                <motion.button
                  key={place.id}
                  type="button"
                  className={`switcher-pill ${analyticsPlace?.id === place.id ? "active" : ""}`}
                  onClick={() => onSelectAnalyticsPlace(place.id)}
                  aria-pressed={analyticsPlace?.id === place.id}
                  whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.95 }}
                >
                  {place.name}
                </motion.button>
              ))}
            </div>
          </motion.div>

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
        <motion.div className="analytics-side" variants={staggerContainer(0.1, 0.15)}>
          <motion.div
            className="glass-card leaderboard-card"
            aria-labelledby="leaderboard-heading"
            variants={fadeUp}
          >
            <div className="section-heading">
              <div>
                <div className="section-kicker">Pressure map</div>
                <h2 id="leaderboard-heading">Most crowded now</h2>
                <p>Realtime capacity ordering across the top active venues.</p>
              </div>
            </div>
            <motion.ul
              className="leaderboard-list"
              role="list"
              variants={staggerContainer(0.06, 0.05)}
            >
              {busyPlaces.map(({ place, crowd }) => (
                <motion.li key={place.id} role="listitem" variants={fadeUp}>
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
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <LiveReportFeed
            reports={globalLiveReports}
            title="Realtime report log"
            subtitle="Track the latest signal changes powering the analytics layer."
          />
        </motion.div>
      </motion.section>
    </motion.div>
  );
});
