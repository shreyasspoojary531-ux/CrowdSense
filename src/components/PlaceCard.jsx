import React from "react";
import { ArrowUpRight, RadioTower, TimerReset } from "lucide-react";
import { GlowCard } from "./GlowCard";
import { AnimatedNumber } from "./AnimatedNumber";

const LEVEL_CONFIG = {
  Low: { dot: "var(--signal-low)", bar: "var(--signal-low)", glow: "green" },
  Medium: { dot: "var(--signal-medium)", bar: "var(--signal-medium)", glow: "orange" },
  High: { dot: "var(--signal-high)", bar: "var(--signal-high)", glow: "red" },
};

export function PlaceCard({ place, crowd, onClick }) {
  const config = LEVEL_CONFIG[crowd.level] || LEVEL_CONFIG.Medium;

  return (
    <GlowCard customSize className="h-full place-card-shell" glowColor={config.glow}>
      <button
        type="button"
        onClick={onClick}
        className="place-card-button"
        aria-label={`View details for ${place.name}`}
      >
        <div className="place-card-top">
          <div className="place-card-icon">{place.icon}</div>
          <div className="place-card-copy">
            <div className="place-card-title-row">
              <h3>{place.name}</h3>
              <span className={`status-${crowd.level.toLowerCase()} place-level-pill`}>
                <span className="animate-pulse-dot place-level-dot" style={{ background: config.dot }} />
                {crowd.level}
              </span>
            </div>
            <p>{place.location}</p>
          </div>
        </div>

        <p className="place-card-description">{place.description}</p>

        <div className="place-card-statline">
          <div className="stat-chip">
            <RadioTower size={14} />
            <span>{crowd.liveSampleSize || 0} live reports</span>
          </div>
          <div className="stat-chip">
            <TimerReset size={14} />
            <span>{crowd.wait}</span>
          </div>
        </div>

        <div className="place-card-progress">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${crowd.percent}%`, background: config.bar }}
            />
          </div>
        </div>

        <div className="place-card-footer">
          <div>
            <span className="place-card-capacity-label">Capacity</span>
            <strong>
              <AnimatedNumber value={crowd.percent} duration={850} suffix="%" />
            </strong>
          </div>
          <span className="place-card-arrow">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </button>
    </GlowCard>
  );
}
