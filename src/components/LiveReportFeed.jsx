import React, { memo } from "react";
import { Activity, Clock3, Zap } from "lucide-react";

/**
 * Format a timestamp as a human-readable relative time string.
 * @param {number} createdAtMs - Unix timestamp in milliseconds.
 * @returns {string}
 */
function formatRelativeTime(createdAtMs) {
  if (!createdAtMs) return "just now";
  const diffSeconds = Math.round(Math.max(0, Date.now() - createdAtMs) / 1000);
  if (diffSeconds < 45) return "just now";
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)} min ago`;
  return `${Math.round(diffSeconds / 3600)} hr ago`;
}

/** CSS class suffix mapped to crowd level label. */
const LEVEL_TONE = { Low: "low", Medium: "medium", High: "high" };

/**
 * Scrollable feed of the most recent live crowd reports for a place or globally.
 * Memoized — only re-renders when the reports array reference changes.
 */
export const LiveReportFeed = memo(function LiveReportFeed({
  reports,
  title = "Live report feed",
  subtitle = "Latest crowd signals shaping the forecast right now.",
  emptyTitle = "No live reports yet",
  emptyCopy = "The next report will instantly rebalance the smart average.",
}) {
  return (
    <div className="glass-card live-feed-card" aria-labelledby="live-feed-heading">
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
        <div className="feed-empty" aria-label={emptyTitle}>
          <Activity size={18} aria-hidden="true" />
          <div>
            <strong>{emptyTitle}</strong>
            <span>{emptyCopy}</span>
          </div>
        </div>
      ) : (
        <ul className="live-feed-list" role="list" aria-label="Recent crowd reports">
          {reports.map((report) => (
            <li key={report.id} className="feed-item" role="listitem">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
