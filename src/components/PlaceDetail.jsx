import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  RadioTower,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { PredictionChart } from "./PredictionChart";
import { TimeSlider } from "./TimeSlider";
import { LiveReportFeed } from "./LiveReportFeed";
import { AnimatedNumber } from "./AnimatedNumber";

export function PlaceDetail({ place, crowdState, onBack }) {
  const {
    getCrowdAtHour,
    getDetail,
    submitReport,
    commitToTime,
    isBecomingCrowded,
    getCommitmentCount,
    getRecentReports,
    getReportSummary,
    realtimeModeLabel,
  } = crowdState;

  const { crowd: liveCrowd, prediction, best, tip } = getDetail(place);
  const reportSummary = getReportSummary(place.id);
  const recentReports = getRecentReports(place.id, 5);

  const [selectedReport, setSelectedReport] = useState("Medium");
  const [intentSubmitted, setIntentSubmitted] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const minHour = Math.floor(currentHour * 2) / 2;
  const maxHour = Math.min(23.5, minHour + 8);

  const [selectedHour, setSelectedHour] = useState(minHour);
  const [crowdAtSelected, setCrowdAtSelected] = useState(() => getCrowdAtHour(place, minHour));

  useEffect(() => {
    setCrowdAtSelected(getCrowdAtHour(place, selectedHour));
  }, [getCrowdAtHour, place, selectedHour]);

  async function handleReport() {
    if (!selectedReport || isSubmittingReport) return;

    setIsSubmittingReport(true);
    setReportStatus("Updating CrowdSense system...");

    // No artificial delay anymore for instant feel
    await submitReport(place.id, selectedReport, { placeName: place.name });

    setReportStatus("Live crowd recalculated");
    window.setTimeout(() => {
      setReportStatus("");
      setIsSubmittingReport(false);
    }, 1500); // Shorter status lingering
  }

  function handleIntent() {
    if (intentSubmitted) return;

    const { othersCount, label } = commitToTime(place.id, selectedHour);
    setIntentSubmitted(true);
    setCrowdAtSelected(getCrowdAtHour(place, selectedHour));
    crowdState.showToast(`You and ${othersCount} others are planning for ${label}.`);

    window.setTimeout(() => {
      setIntentSubmitted(false);
    }, 4000);
  }

  const activeCrowd =
    Math.abs(selectedHour - currentHour) < 0.25 ? liveCrowd : crowdAtSelected || liveCrowd;
  const activeColor =
    activeCrowd.level === "High"
      ? "var(--signal-high)"
      : activeCrowd.level === "Medium"
        ? "var(--signal-medium)"
        : "var(--signal-low)";

  const isPeak = activeCrowd.level === "High";
  const crowdedWarning = isBecomingCrowded(place.id, selectedHour);
  const commitCount = getCommitmentCount(place.id, selectedHour);
  const circleCircumference = 2 * Math.PI * 54;

  return (
    <div className="detail-shell animate-fade-up">
      <button type="button" onClick={onBack} className="btn-outline detail-back">
        <ArrowLeft size={16} />
        <span>Back to command center</span>
      </button>

      <div className="detail-grid">
        <div className="detail-left">
          <div className="glass-card detail-hero-card">
            <div className="detail-header">
              <div className="detail-place-icon">{place.icon}</div>
              <div>
                <div className="section-kicker">Realtime venue</div>
                <h1>{place.name}</h1>
                <p>{place.location}</p>
              </div>
            </div>

            <div className="detail-capacity-panel">
              <div className="detail-capacity-ring">
                <svg width="136" height="136" viewBox="0 0 136 136">
                  <circle cx="68" cy="68" r="54" className="capacity-track" />
                  <circle
                    cx="68"
                    cy="68"
                    r="54"
                    className="capacity-progress"
                    style={{
                      stroke: activeColor,
                      strokeDasharray: circleCircumference,
                      strokeDashoffset: circleCircumference * (1 - activeCrowd.percent / 100),
                    }}
                  />
                </svg>
                <div className="detail-capacity-copy">
                  <strong style={{ color: activeColor }}>
                    <AnimatedNumber value={activeCrowd.percent} duration={900} suffix="%" />
                  </strong>
                  <span>capacity</span>
                </div>
              </div>

              <div className="detail-capacity-meta">
                <div className={`status-${activeCrowd.level.toLowerCase()} detail-level-pill`}>
                  <span className="animate-pulse-dot place-level-dot" style={{ background: activeColor }} />
                  {activeCrowd.level} crowd
                </div>
                <div className="detail-metric-row">
                  <Clock3 size={15} />
                  <span>{activeCrowd.wait} wait right now</span>
                </div>
                <div className="detail-metric-row">
                  <RadioTower size={15} />
                  <span>{reportSummary?.sampleSize || 0} live reports blended</span>
                </div>
                <div className="detail-metric-row">
                  <Sparkles size={15} />
                  <span>{place.capacity} person venue capacity</span>
                </div>
              </div>
            </div>

            <div className="tip-banner">
              <Sparkles size={16} />
              <span>{tip}</span>
            </div>
          </div>

          <TimeSlider
            value={selectedHour}
            min={minHour}
            max={maxHour}
            onChange={setSelectedHour}
            crowdAtTime={crowdAtSelected}
          />

          <div className="glass-card intent-card">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Visitor intent</div>
                <h3>Model the crowd shift</h3>
                <p>Planned arrivals nudge the curve so the forecast reacts like a live system.</p>
              </div>
            </div>

            <button type="button" className="btn-primary" onClick={handleIntent}>
              <CalendarClock size={16} />
              <span>
                {intentSubmitted ? "Visit scheduled" : "I will go at this time"}
              </span>
            </button>

            {commitCount > 0 && (
              <div className="intent-impact">
                <span className="status-dot" />
                <span>
                  Active plans are adding roughly <strong>{commitCount * 8}%</strong> pressure to this slot.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-right">
          <div className="best-time-card">
            <div className="best-time-copy">
              <div className="section-kicker">AI recommendation</div>
              <h3>Best time to visit: {best.label}</h3>
              <p>
                Expected {best.level.toLowerCase()} crowd with up to{" "}
                {Math.max(5, Math.round((liveCrowd.score - best.score) * 30) + 5)} minutes saved.
              </p>
            </div>
          </div>

          {crowdedWarning && (
            <div className="impact-card">
              <TriangleAlert size={18} />
              <div>
                <strong>Tipping point reached</strong>
                <span>
                  Users are converging on this slot, so CrowdSense has steepened the live forecast.
                </span>
              </div>
            </div>
          )}

          {isPeak && !crowdedWarning && (
            <div className="peak-warning">
              <Flame size={18} />
              <div>
                <strong>Peak crowd detected</strong>
                <span>Traffic is naturally elevated right now and wait times are stretched.</span>
              </div>
            </div>
          )}

          <PredictionChart
            data={prediction}
            highlightHour={selectedHour}
            title="Live forecast"
            subtitle={`${realtimeModeLabel} blended with the last ${reportSummary?.sampleSize || 0} reports.`}
          />

          <div className="glass-card detail-report-card">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Standard report</div>
                <h3>Update the live system</h3>
                <p>Submit what you are seeing right now and CrowdSense will rebalance instantly.</p>
              </div>
            </div>

            <div className="report-options" style={{ marginBottom: "12px" }}>
              {["Low", "Medium", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`crowd-opt ${selectedReport === level ? `selected-${level.toLowerCase()}` : ""}`}
                  onClick={() => setSelectedReport(level)}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="detail-report-actions" style={{ marginTop: "8px" }}>
              <button type="button" className="btn-primary" onClick={handleReport} style={{ width: "100%", padding: "16px" }}>
                <RadioTower size={16} />
                <span>Submit report</span>
              </button>
            </div>

            {reportStatus && (
              <div className="report-status">
                {reportStatus === "Live crowd recalculated" ? <CheckCircle2 size={16} /> : <RadioTower size={16} />}
                <span>{reportStatus}{reportStatus === "Live crowd recalculated" ? " ⚡" : ""}</span>
              </div>
            )}
          </div>

          <LiveReportFeed
            reports={recentReports}
            title="Venue report stream"
            subtitle="Latest reports contributing to this location's smart average."
            emptyCopy="Be the first live signal for this venue."
          />
        </div>
      </div>
    </div>
  );
}
