import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.jsx";

/**
 * Application entry point.
 * Wraps the app in StrictMode for development-time warnings and an
 * ErrorBoundary so unhandled render errors show a friendly recovery UI
 * instead of a blank crash screen.
 */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
