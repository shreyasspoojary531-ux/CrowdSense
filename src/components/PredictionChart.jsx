import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLOR_BY_LEVEL = {
  Low: "var(--signal-low)",
  Medium: "var(--signal-medium)",
  High: "var(--signal-high)",
};

function resolveLevel(value) {
  if (value >= 65) return "High";
  if (value >= 38) return "Medium";
  return "Low";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;
  const level = resolveLevel(value);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value" style={{ color: COLOR_BY_LEVEL[level] }}>
        {level} crowd · {Math.round(value)}% capacity
      </div>
    </div>
  );
}

export function PredictionChart({ data, highlightHour, title = "Crowd forecast", subtitle }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card chart-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <p style={{ color: "var(--color-text-soft)" }}>No forecast data available for this venue.</p>
      </div>
    );
  }

  const chartData = data.map((slot) => ({
    label: slot.label,
    value: slot.percent,
    hour: slot.hour,
    level: slot.level,
  }));

  return (
    <div className="glass-card chart-card">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Analytics</div>
          <h3>{title}</h3>
          <p>{subtitle || "Realtime reports are blended into the forecast for the next three hours."}</p>
        </div>
      </div>

      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="crowdsenseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-glow)" stopOpacity={0.45} />
                <stop offset="50%" stopColor="var(--brand-secondary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid-line)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--brand-glow)", strokeOpacity: 0.25 }} />
            <ReferenceLine y={65} stroke="rgba(248, 113, 113, 0.32)" strokeDasharray="4 4" />
            <ReferenceLine y={38} stroke="rgba(250, 204, 21, 0.28)" strokeDasharray="4 4" />
            {typeof highlightHour === "number" && (
              <ReferenceLine x={chartData.find((point) => point.hour === highlightHour)?.label} stroke="rgba(96, 165, 250, 0.45)" />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--brand-glow)"
              strokeWidth={3}
              fill="url(#crowdsenseAreaGradient)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={payload.label}
                    cx={cx}
                    cy={cy}
                    r={4.5}
                    fill={COLOR_BY_LEVEL[payload.level]}
                    stroke="var(--color-bg)"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--brand-glow)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        <span>
          <i style={{ background: "var(--signal-low)" }} />
          Low
        </span>
        <span>
          <i style={{ background: "var(--signal-medium)" }} />
          Medium
        </span>
        <span>
          <i style={{ background: "var(--signal-high)" }} />
          High
        </span>
      </div>
    </div>
  );
}
