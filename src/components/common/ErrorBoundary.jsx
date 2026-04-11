import React from "react";

/**
 * Application-level error boundary.
 *
 * Wraps the entire app to catch unhandled rendering errors and display a
 * user-friendly fallback UI instead of a blank crash screen.
 * In production, componentDidCatch would forward errors to a monitoring
 * service such as Sentry.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** Derive error state from a caught render error. */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /** Log the error (extend here to send to a remote monitoring service). */
  componentDidCatch(error, info) {
    console.error("[CrowdSense] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="glass-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "48px 32px",
            margin: "48px auto",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "2.5rem" }} aria-hidden="true">⚡</span>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "var(--color-text-soft)", margin: 0 }}>
            CrowdSense hit an unexpected error. Your data is safe — tap below to reload.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
