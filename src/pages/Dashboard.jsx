import React, { memo } from "react";
import {
  Activity,
  ArrowUpRight,
  Compass,
  PlusSquare,
  RadioTower,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { PlaceCard } from "../components/PlaceCard";
import { LiveReportFeed } from "../components/LiveReportFeed";
import { MetricCard } from "../components/common/MetricCard";
import { TypewriterText } from "../components/common/TypewriterText";
import { fadeUp, staggerContainer } from "../components/motion/variants";

const TYPEWRITER_WORDS = ["Move Smarter", "See it Happen"];

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
    <motion.div
      className="page-stack"
      variants={staggerContainer(0.09, 0)}
      initial="hidden"
      animate="show"
    >
      {/* ── Hero ── */}
      <motion.section
        className="glass-card hero-panel"
        variants={fadeUp}
        aria-labelledby="hero-heading"
      >
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
            <motion.button
              type="button"
              className="btn-primary hero-primary"
              onClick={() => onTabChange("report")}
              whileHover={{ scale: 1.03, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.96 }}
            >
              <PlusSquare size={16} aria-hidden="true" />
              <span>Add a live report</span>
            </motion.button>
            <motion.button
              type="button"
              className="btn-secondary hero-secondary"
              onClick={() => onTabChange("explore")}
              whileHover={{ scale: 1.03, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.96 }}
            >
              <Compass size={16} aria-hidden="true" />
              <span>Explore places</span>
            </motion.button>
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
      </motion.section>

      {/* ── Key Metrics ── */}
      <motion.section
        className="metric-grid"
        variants={staggerContainer(0.07, 0.05)}
        aria-label="Key metrics"
      >
        <MetricCard icon={Activity}    label="Monitored places"    value={allPlaces.length}             tone="orange" />
        <MetricCard icon={RadioTower}  label="Live reports buffered" value={reportStats.totalReports}   tone="orange" />
        <MetricCard icon={Compass}     label="Quiet spots right now" value={quietCount}                 tone="orange" />
        <MetricCard icon={TrendingUp}  label="Network average load"  value={`${avgCapacity}%`}          tone="orange" />
      </motion.section>

      {/* ── Signal Panel + Feed ── */}
      <motion.section className="dashboard-split" variants={fadeUp}>
        <motion.div
          className="glass-card signal-panel"
          aria-labelledby="best-places-heading"
          variants={fadeUp}
        >
          <div className="section-heading">
            <div>
              <div className="section-kicker">Go now</div>
              <h2 id="best-places-heading">Best places at this moment</h2>
              <p>These venues currently have the softest crowd pressure across the network.</p>
            </div>
          </div>

          <motion.ul
            className="signal-list"
            role="list"
            aria-label="Quietest venues right now"
            variants={staggerContainer(0.06, 0.1)}
          >
            {quietPlaces.map(({ place, crowd }) => (
              <motion.li key={place.id} role="listitem" variants={fadeUp}>
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
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <LiveReportFeed
          reports={globalLiveReports}
          title="Network activity"
          subtitle="Fresh reports are recalculating capacity and graph data across the app."
        />
      </motion.section>

      {/* ── Featured Place Cards ── */}
      <motion.section
        className="dashboard-card-grid"
        aria-label="Featured venues"
        variants={staggerContainer(0.07, 0.05)}
      >
        {quietPlaces.concat(busyPlaces.slice(0, 2)).map(({ place, crowd }) => (
          <motion.div key={place.id} variants={fadeUp}>
            <PlaceCard
              place={place}
              crowd={crowd}
              onClick={() => onSelectPlace(place)}
            />
          </motion.div>
        ))}
      </motion.section>
    </motion.div>
  );
});
