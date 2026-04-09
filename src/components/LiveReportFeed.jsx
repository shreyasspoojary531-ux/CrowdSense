import React from "react";
import { Activity, Clock3, Zap } from "lucide-react";

function formatRelativeTime(createdAtMs) {
  if (!createdAtMs) return "just now";

  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 45) return "just now";
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)} min ago`;
  return `${Math.round(diffSeconds / 3600)} hr ago`;
}

const levelToneClass = {
  Low: "low",
  Medium: "medium",
  High: "high",
};

export function LiveReportFeed({
  reports,
  title = "Live report feed",
  subtitle = "Latest crowd signals shaping the forecast right now.",
  emptyTitle = "No live reports yet",
  emptyCopy = "The next report will instantly rebalance the smart average.",
}) {
  return (
    <div className="glass-card live-feed-card">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Live system</div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="live-feed-badge">
          <Zap size={14} />
          <span>Realtime</span>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="feed-empty">
          <Activity size={18} />
          <div>
            <strong>{emptyTitle}</strong>
            <span>{emptyCopy}</span>
          </div>
        </div>
      ) : (
        <div className="live-feed-list">
          {reports.map((report) => (
            <div key={report.id} className="feed-item">
              <div className={`feed-level ${levelToneClass[report.level] || "medium"}`}>
                <span>{report.level}</span>
              </div>
              <div className="feed-copy">
                <strong>{report.placeName || report.placeId}</strong>
                <span>Blended into the last 10 crowd reports</span>
              </div>
              <div className="feed-time">
                <Clock3 size={14} />
                <span>{formatRelativeTime(report.createdAtMs)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
