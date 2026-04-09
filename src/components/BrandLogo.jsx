import React from "react";

export function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo ${compact ? "compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="5" className="brand-mark-core" />
          <path d="M13 24a11 11 0 0 1 22 0" className="brand-mark-wave wave-1" />
          <path d="M8 24a16 16 0 0 1 32 0" className="brand-mark-wave wave-2" />
          <path d="M18 32a7 7 0 0 0 12 0" className="brand-mark-wave wave-3" />
        </svg>
      </div>
      <div className="brand-copy">
        <span className="brand-title">CrowdSense</span>
        {!compact && <span className="brand-tagline">Real-time crowd intelligence</span>}
      </div>
    </div>
  );
}
