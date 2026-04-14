import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logError } from "./lib/errorLogger";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

window.addEventListener("unhandledrejection", (event) => {
  logError(event.reason, { module: "app", action: "unhandledrejection" });
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
