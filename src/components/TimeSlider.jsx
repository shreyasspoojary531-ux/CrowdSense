import React from "react";
import { Clock3, WandSparkles } from "lucide-react";
import { formatHour } from "../utils/prediction";
import { AnimatedNumber } from "./AnimatedNumber";

function getLevelColor(level) {
  if (level === "High") return "var(--signal-high)";
  if (level === "Medium") return "var(--signal-medium)";
  return "var(--signal-low)";
}

export function TimeSlider({ value, min, max, onChange, crowdAtTime }) {
  const levelColor = getLevelColor(crowdAtTime?.level);

  return (
    <div className="glass-card time-slider-card">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Smart preview</div>
          <h3>Time travel</h3>
          <p>Scrub forward to see how the live forecast shifts before you arrive.</p>
        </div>
        <div className="live-feed-badge">
          <WandSparkles size={14} />
          <span>Interactive</span>
        </div>
      </div>

      <div className="time-preview" style={{ borderColor: `${levelColor}55`, background: `${levelColor}12` }}>
        <div className="time-preview-label">
          <Clock3 size={14} />
          <span>Previewing {formatHour(value)}</span>
        </div>
        <div className="time-preview-value" style={{ color: levelColor }}>
          <AnimatedNumber value={crowdAtTime?.percent || 0} duration={900} suffix="%" />
        </div>
        <p style={{ color: levelColor }}>
          {crowdAtTime?.level || "Low"} crowd · {crowdAtTime?.wait || "< 2 min"} wait
        </p>
      </div>

      <input
        type="range"
        className="time-slider"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        aria-label="Time travel slider"
      />

      <div className="time-scale">
        <span>{formatHour(min)}</span>
        <span>{formatHour((min + max) / 2)}</span>
        <span>{formatHour(max)}</span>
      </div>
    </div>
  );
}
