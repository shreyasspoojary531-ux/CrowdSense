import React, { memo, useCallback, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, RadioTower, Sparkles } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

const REPORT_OPTIONS = ["Low", "Medium", "High"];

/**
 * Quick report submission panel used on the Report tab.
 *
 * Memoized — only re-renders when places, crowdState, initialPlaceId, or
 * onOpenPlace references change.
 *
 * Accessibility:
 * - Crowd level buttons are in a group with an aria-label.
 * - Each level button uses aria-pressed to signal its selected state.
 */
export const QuickReportPanel = memo(function QuickReportPanel({
  places,
  crowdState,
  initialPlaceId,
  onOpenPlace,
}) {
  const [placeId, setPlaceId] = useState(initialPlaceId || places[0]?.id || "");
  const [selectedLevel, setSelectedLevel] = useState("Medium");
  const [statusText, setStatusText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === placeId) || places[0] || null,
    [placeId, places]
  );

  const selectedCrowd = selectedPlace ? crowdState.getCrowd(selectedPlace) : null;
  const reportSummary = selectedPlace ? crowdState.getReportSummary(selectedPlace.id) : null;

  const handleSubmit = useCallback(async () => {
    if (!selectedPlace || !selectedLevel || isSubmitting) return;

    setIsSubmitting(true);
    setStatusText("Updating CrowdSense system...");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await crowdState.submitReport(selectedPlace.id, selectedLevel, {
        placeName: selectedPlace.name,
      });
      setStatusText("Live crowd recalculated");
    } catch {
      setStatusText("Failed to submit. Please try again.");
    } finally {
      window.setTimeout(() => {
        setStatusText("");
        setIsSubmitting(false);
      }, 2200);
    }
  }, [crowdState, isSubmitting, selectedLevel, selectedPlace]);

  const isSuccess = statusText === "Live crowd recalculated";

  return (
    <div className="glass-card report-console">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Add report</div>
          <h2>Push a live crowd signal</h2>
          <p>Each report instantly updates the smart average shared across the app.</p>
        </div>
        <div className="live-feed-badge" aria-hidden="true">
          <RadioTower size={14} />
          <span>{crowdState.realtimeModeLabel}</span>
        </div>
      </div>

      <div className="report-console-grid">
        {/* ── Form ── */}
        <div className="report-form">
          <label className="field-label" htmlFor="quick-report-place">
            Choose a place
          </label>

          {/* Custom dropdown */}
          <div className="custom-dropdown" style={{ position: "relative" }}>
            <button
              id="quick-report-place"
              type="button"
              className="surface-select"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span>{selectedPlace?.name || "Select a place"}</span>
              <ArrowRight
                size={16}
                aria-hidden="true"
                style={{
                  transform: dropdownOpen ? "rotate(-90deg)" : "rotate(90deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="dropdown-items-overlay animate-fade-up"
                role="listbox"
                aria-label="Select a venue"
              >
                {places.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={placeId === place.id}
                    className={`dropdown-item ${placeId === place.id ? "selected" : ""}`}
                    onClick={() => {
                      setPlaceId(place.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: "0.95rem" }}>{place.name}</strong>
                      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{place.location}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Crowd level selector */}
          <div
            className="report-options"
            role="group"
            aria-label="Crowd level"
          >
            {REPORT_OPTIONS.map((level) => (
              <button
                key={level}
                type="button"
                className={`crowd-opt ${selectedLevel === level ? `selected-${level.toLowerCase()}` : ""}`}
                aria-pressed={selectedLevel === level}
                onClick={() => setSelectedLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            className="btn-primary report-submit"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <span>Submit live report</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="btn-outline report-secondary"
            onClick={() => selectedPlace && onOpenPlace(selectedPlace)}
          >
            Open place details
          </button>
        </div>

        {/* ── Preview ── */}
        <div className="report-preview">
          <div className="report-preview-card" aria-label="Current crowd estimate">
            <div className="report-preview-header">
              <span>Current smart estimate</span>
              <Sparkles size={15} aria-hidden="true" />
            </div>
            <div className="report-preview-value" aria-live="polite">
              <AnimatedNumber value={selectedCrowd?.percent || 0} duration={900} suffix="%" />
            </div>
            <p>{selectedCrowd?.level || "Low"} crowd right now</p>
            <div className="report-preview-meta">
              <span>{selectedCrowd?.wait || "< 2 min"} wait</span>
              <span>{reportSummary?.sampleSize || 0} live reports blended</span>
            </div>
          </div>

          {statusText && (
            <div className="report-status" role="status" aria-live="polite">
              {isSuccess ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <RadioTower size={16} aria-hidden="true" />
              )}
              <span>
                {statusText}
                {isSuccess ? " ⚡" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
