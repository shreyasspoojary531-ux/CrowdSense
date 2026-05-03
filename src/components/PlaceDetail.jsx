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

const LEVEL_COLOR = {
  High: "var(--signal-high)",
  Medium: "var(--signal-medium)",
  Low: "var(--signal-low)",
};

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

  let detailData = null;
  let detailError = null;
  try {
    detailData = getDetail(place);
  } catch (err) {
    detailError = err;
  }

  const { crowd: liveCrowd, prediction, best, tip } = detailData || {};
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
    try {
      await submitReport(place.id, selectedReport, { placeName: place.name });
      setReportStatus("Live crowd recalculated");
    } catch {
      setReportStatus("Failed to submit. Please try again.");
    } finally {
      window.setTimeout(() => {
        setReportStatus("");
        setIsSubmittingReport(false);
      }, 1500);
    }
  }

  function handleIntent() {
    if (intentSubmitted) return;
    const { othersCount, label } = commitToTime(place.id, selectedHour);
    setIntentSubmitted(true);
    setCrowdAtSelected(getCrowdAtHour(place, selectedHour));
    crowdState.showToast(`You and ${othersCount} others are planning for ${label}.`);
    window.setTimeout(() => setIntentSubmitted(false), 4000);
  }

  if (detailError) {
    return (
      <div className="detail-shell">
        <button type="button" onClick={onBack} className="btn-outline detail-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to command center</span>
        </button>
        <div className="glass-card" role="alert" style={{ padding: "32px", textAlign: "center", marginTop: "24px" }}>
          <p>Could not load venue details. Please go back and try again.</p>
        </div>
      </div>
    );
  }

  const activeCrowd =
    Math.abs(selectedHour - currentHour) < 0.25 ? liveCrowd : crowdAtSelected || liveCrowd;
  const activeColor = LEVEL_COLOR[activeCrowd?.level] || LEVEL_COLOR.Low;
  const isPeak = activeCrowd?.level === "High";
  const crowdedWarning = isBecomingCrowded(place.id, selectedHour);
  const commitCount = getCommitmentCount(place.id, selectedHour);
  const circleCircumference = 2 * Math.PI * 54;
  const isSuccessStatus = reportStatus === "Live crowd recalculated";

  return (
    <div className="detail-shell animate-fade-up">
      <button type="button" onClick={onBack} className="btn-outline detail-back">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to command center</span>
      </button>

      {/* ══════════════════════════════════════════════
          SECTION 1 — Realtime venue · Best time · Analytics
          ══════════════════════════════════════════════ */}
      <div className="detail-section-label">
        <span className="detail-section-tag">Section 1</span>
        <span className="detail-section-title">Realtime venue &amp; Analytics</span>
      </div>

      <div className="detail-grid">
        {/* Left — venue hero */}
        <div className="detail-left">
          <div className="glass-card detail-hero-card">
            <div className="detail-header">
              <div className="detail-place-icon" aria-hidden="true">{place.icon}</div>
              <div>
                <div className="section-kicker">Realtime venue</div>
                <h1>{place.name}</h1>
                <p>{place.location}</p>
              </div>
            </div>

            <div className="detail-capacity-panel">
              <div className="detail-capacity-ring">
                <svg
                  width="136"
                  height="136"
                  viewBox="0 0 136 136"
                  role="img"
                  aria-label={`Capacity gauge: ${activeCrowd?.percent ?? 0}% full`}
                >
                  <circle cx="68" cy="68" r="54" className="capacity-track" />
                  <circle
                    cx="68" cy="68" r="54"
                    className="capacity-progress"
                    style={{
                      stroke: activeColor,
                      strokeDasharray: circleCircumference,
                      strokeDashoffset: circleCircumference * (1 - (activeCrowd?.percent ?? 0) / 100),
                    }}
                  />
                </svg>
                <div className="detail-capacity-copy">
                  <strong style={{ color: activeColor }}>
                    <AnimatedNumber value={activeCrowd?.percent ?? 0} duration={900} suffix="%" />
                  </strong>
                  <span>capacity</span>
                </div>
              </div>

              <div className="detail-capacity-meta">
                <div className={`status-${(activeCrowd?.level ?? "low").toLowerCase()} detail-level-pill`}>
                  <span
                    className="animate-pulse-dot place-level-dot"
                    style={{ background: activeColor }}
                    aria-hidden="true"
                  />
                  {activeCrowd?.level} crowd
                </div>
                <div className="detail-metric-row">
                  <Clock3 size={15} aria-hidden="true" />
                  <span>{activeCrowd?.wait} wait right now</span>
                </div>
                <div className="detail-metric-row">
                  <RadioTower size={15} aria-hidden="true" />
                  <span>{reportSummary?.sampleSize || 0} live reports blended</span>
                </div>
                <div className="detail-metric-row">
                  <Sparkles size={15} aria-hidden="true" />
                  <span>{place.capacity} person venue capacity</span>
                </div>
              </div>
            </div>

            <div className="tip-banner" role="note">
              <Sparkles size={16} aria-hidden="true" />
              <span>{tip}</span>
            </div>
          </div>
        </div>

        {/* Right — best time + forecast */}
        <div className="detail-right">
          <div className="best-time-card">
            <div className="best-time-copy">
              <div className="section-kicker">AI recommendation</div>
              <h2>Best time to visit: {best?.label}</h2>
              <p>
                Expected {best?.level?.toLowerCase()} crowd with up to{" "}
                {Math.max(5, Math.round(((liveCrowd?.score ?? 0) - (best?.score ?? 0)) * 30) + 5)}{" "}
                minutes saved.
              </p>
            </div>
          </div>

          {crowdedWarning && (
            <div className="impact-card" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <div>
                <strong>Tipping point reached</strong>
                <span>Users are converging on this slot, so CrowdSense has steepened the live forecast.</span>
              </div>
            </div>
          )}

          {isPeak && !crowdedWarning && (
            <div className="peak-warning" role="alert">
              <Flame size={18} aria-hidden="true" />
              <div>
                <strong>Peak crowd detected</strong>
                <span>Traffic is naturally elevated right now and wait times are stretched.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-width Live Forecast chart ── */}
      <PredictionChart
        data={prediction}
        highlightHour={selectedHour}
        title="Live forecast"
        subtitle={`${realtimeModeLabel} blended with the last ${reportSummary?.sampleSize || 0} reports.`}
      />

      {/* ── Section Divider ── */}
      <div className="detail-divider" role="separator" aria-hidden="true">
        <span className="detail-divider-line" />
        <span className="detail-divider-text">Actions &amp; Live Reports</span>
        <span className="detail-divider-line" />
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 2 — Time travel · Intent · Reports · Feed
          ══════════════════════════════════════════════ */}
      <div className="detail-section-label">
        <span className="detail-section-tag">Section 2</span>
        <span className="detail-section-title">Time travel, reporting &amp; live feed</span>
      </div>

      <div className="detail-grid">
        {/* Left — time slider + visitor intent */}
        <div className="detail-left">
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
                <h2>Model the crowd shift</h2>
                <p>Planned arrivals nudge the curve so the forecast reacts like a live system.</p>
              </div>
            </div>

            <button type="button" className="btn-primary" onClick={handleIntent}>
              <CalendarClock size={16} aria-hidden="true" />
              <span>{intentSubmitted ? "Visit scheduled" : "I will go at this time"}</span>
            </button>

            {commitCount > 0 && (
              <div className="intent-impact" role="note" aria-live="polite">
                <span className="status-dot" aria-hidden="true" />
                <span>
                  Active plans are adding roughly{" "}
                  <strong>{commitCount * 8}%</strong> pressure to this slot.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right — report submission + live feed */}
        <div className="detail-right">
          <div className="glass-card detail-report-card">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Standard report</div>
                <h2>Update the live system</h2>
                <p>Submit what you are seeing right now and CrowdSense will rebalance instantly.</p>
              </div>
            </div>

            <div
              className="report-options"
              role="group"
              aria-label="Crowd level"
              style={{ marginBottom: "12px" }}
            >
              {["Low", "Medium", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`crowd-opt ${selectedReport === level ? `selected-${level.toLowerCase()}` : ""}`}
                  aria-pressed={selectedReport === level}
                  onClick={() => setSelectedReport(level)}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="detail-report-actions" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleReport}
                disabled={isSubmittingReport}
                aria-busy={isSubmittingReport}
                style={{ width: "100%", padding: "16px" }}
              >
                <RadioTower size={16} aria-hidden="true" />
                <span>Submit report</span>
              </button>
            </div>

            {reportStatus && (
              <div className="report-status" role="status" aria-live="polite">
                {isSuccessStatus ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <RadioTower size={16} aria-hidden="true" />
                )}
                <span>{reportStatus}{isSuccessStatus ? " ⚡" : ""}</span>
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
