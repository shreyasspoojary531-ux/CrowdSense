import React, { memo } from "react";

/**
 * A single metric display card with an icon, label, and value.
 * Wrapped with React.memo to prevent re-renders when unrelated app state changes.
 *
 * @param {{ icon: React.ComponentType, label: string, value: string|number, tone?: string }} props
 */
export const MetricCard = memo(function MetricCard({ icon: IconComponent, label, value, tone = "default" }) {
  return (
    <div className={`glass-card metric-card tone-${tone}`}>
      <div className="metric-card-icon">
        <IconComponent size={18} aria-hidden="true" />
      </div>
      <div className="metric-card-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
});
