import React, { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, RadioTower, Sparkles } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

const REPORT_OPTIONS = ["Low", "Medium", "High"];

export function QuickReportPanel({ places, crowdState, initialPlaceId, onOpenPlace }) {
  const [placeId, setPlaceId] = useState(initialPlaceId || places[0]?.id || "");
  const [selectedLevel, setSelectedLevel] = useState("Medium");
  const [statusText, setStatusText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === placeId) || places[0] || null,
    [placeId, places]
  );

  const selectedCrowd = selectedPlace ? crowdState.getCrowd(selectedPlace) : null;
  const reportSummary = selectedPlace ? crowdState.getReportSummary(selectedPlace.id) : null;

  async function handleSubmit() {
    if (!selectedPlace || !selectedLevel || isSubmitting) return;

    setIsSubmitting(true);
    setStatusText("Updating CrowdSense system...");

    await new Promise((resolve) => window.setTimeout(resolve, 500));
    await crowdState.submitReport(selectedPlace.id, selectedLevel, { placeName: selectedPlace.name });

    setStatusText("Live crowd recalculated");
    window.setTimeout(() => {
      setStatusText("");
      setIsSubmitting(false);
    }, 2200);
  }

  return (
    <div className="glass-card report-console">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Add report</div>
          <h3>Push a live crowd signal</h3>
          <p>Each report instantly updates the smart average shared across the app.</p>
        </div>
        <div className="live-feed-badge">
          <RadioTower size={14} />
          <span>{crowdState.realtimeModeLabel}</span>
        </div>
      </div>

      <div className="report-console-grid">
        <div className="report-form">
          <label className="field-label" htmlFor="quick-report-place">
            Choose a place
          </label>
          <select
            id="quick-report-place"
            className="surface-select"
            value={selectedPlace?.id || ""}
            onChange={(event) => setPlaceId(event.target.value)}
          >
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>

          <div className="report-options">
            {REPORT_OPTIONS.map((level) => (
              <button
                key={level}
                type="button"
                className={`crowd-opt ${selectedLevel === level ? `selected-${level.toLowerCase()}` : ""}`}
                onClick={() => setSelectedLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <button className="btn-primary report-submit" type="button" onClick={handleSubmit}>
            <span>Submit live report</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn-outline report-secondary"
            onClick={() => selectedPlace && onOpenPlace(selectedPlace)}
          >
            Open place details
          </button>
        </div>

        <div className="report-preview">
          <div className="report-preview-card">
            <div className="report-preview-header">
              <span>Current smart estimate</span>
              <Sparkles size={15} />
            </div>
            <div className="report-preview-value">
              <AnimatedNumber value={selectedCrowd?.percent || 0} duration={900} suffix="%" />
            </div>
            <p>{selectedCrowd?.level || "Low"} crowd right now</p>
            <div className="report-preview-meta">
              <span>{selectedCrowd?.wait || "< 2 min"} wait</span>
              <span>{reportSummary?.sampleSize || 0} live reports blended</span>
            </div>
          </div>

          {statusText && (
            <div className="report-status">
              {statusText === "Live crowd recalculated" ? <CheckCircle2 size={16} /> : <RadioTower size={16} />}
              <span>{statusText}{statusText === "Live crowd recalculated" ? " " : ""}{statusText === "Live crowd recalculated" ? "⚡" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
