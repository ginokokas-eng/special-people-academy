import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNativeShell, initNativeChrome } from "./lib/native";

// Native shell only: tag the document so the app-shell CSS applies, and set up
// the transparent status bar / safe-area variables. No-ops on the web.
if (isNativeShell()) {
  document.documentElement.classList.add("native");
  void initNativeChrome();
}

createRoot(document.getElementById("root")!).render(<App />);
