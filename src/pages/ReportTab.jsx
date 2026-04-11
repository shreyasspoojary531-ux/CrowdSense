import React, { memo } from "react";
import { QuickReportPanel } from "../components/QuickReportPanel";
import { LiveReportFeed } from "../components/LiveReportFeed";

/**
 * Report tab page — allows users to submit crowd-level reports for any venue.
 *
 * Intentionally thin: delegates all logic to QuickReportPanel and LiveReportFeed.
 */
export const ReportTab = memo(function ReportTab({
  allPlaces,
  crowdState,
  analyticsPlace,
  globalLiveReports,
  onOpenPlace,
}) {
  return (
    <div className="page-stack">
      <QuickReportPanel
        places={allPlaces}
        crowdState={crowdState}
        initialPlaceId={analyticsPlace?.id}
        onOpenPlace={onOpenPlace}
      />
      <LiveReportFeed
        reports={globalLiveReports}
        title="Latest system updates"
        subtitle="Each new report updates capacity percentages, cards, and charts in realtime."
      />
    </div>
  );
});
