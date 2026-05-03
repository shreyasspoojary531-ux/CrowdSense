import React, { memo } from "react";
import { Activity, Clock3, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fadeUp, slideInLeft, staggerContainer } from "./motion/variants";

function formatRelativeTime(createdAtMs) {
  if (!createdAtMs) return "just now";
  const diffSeconds = Math.round(Math.max(0, Date.now() - createdAtMs) / 1000);
  if (diffSeconds < 45) return "just now";
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)} min ago`;
  return `${Math.round(diffSeconds / 3600)} hr ago`;
}

const LEVEL_TONE = { Low: "low", Medium: "medium", High: "high" };

export const LiveReportFeed = memo(function LiveReportFeed({
  reports,
  title = "Live report feed",
  subtitle = "Latest crowd signals shaping the forecast right now.",
  emptyTitle = "No live reports yet",
  emptyCopy = "The next report will instantly rebalance the smart average.",
}) {
  return (
    <motion.div
      className="glass-card live-feed-card"
      aria-labelledby="live-feed-heading"
      variants={fadeUp}
      initial="hidden"
      animate="show"
    >
      <div className="section-heading">
        <div>
          <div className="section-kicker">Live system</div>
          <h3 id="live-feed-heading">{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="live-feed-badge" aria-hidden="true">
          <Zap size={14} />
          <span>Realtime</span>
        </div>
      </div>

      {reports.length === 0 ? (
        <motion.div
          className="feed-empty"
          aria-label={emptyTitle}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <Activity size={18} aria-hidden="true" />
          <div>
            <strong>{emptyTitle}</strong>
            <span>{emptyCopy}</span>
          </div>
        </motion.div>
      ) : (
        <motion.ul
          className="live-feed-list"
          role="list"
          aria-label="Recent crowd reports"
          variants={staggerContainer(0.055, 0.05)}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {reports.map((report) => (
              <motion.li
                key={report.id}
                className="feed-item"
                role="listitem"
                variants={slideInLeft}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, x: 16, scale: 0.96, transition: { duration: 0.18 } }}
                layout
              >
                <div className={`feed-level ${LEVEL_TONE[report.level] || "medium"}`}>
                  <span>{report.level}</span>
                </div>
                <div className="feed-copy">
                  <strong>{report.placeName || report.placeId}</strong>
                  <span>Blended into the last 10 crowd reports</span>
                </div>
                <div className="feed-time" aria-label={formatRelativeTime(report.createdAtMs)}>
                  <Clock3 size={14} aria-hidden="true" />
                  <span>{formatRelativeTime(report.createdAtMs)}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </motion.div>
  );
});
