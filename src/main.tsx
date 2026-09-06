import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNativeShell, initNativeChrome } from "./lib/native";
import { breakOutOfUnexpectedFrame } from "./lib/lmsBridge";

// Native shell only: tag the document so the app-shell CSS applies, and set up
// the transparent status bar / safe-area variables. No-ops on the web.
if (isNativeShell()) {
  document.documentElement.classList.add("native");
  void initNativeChrome();
}

// Clickjacking guard: any framing that did not come through /launch (an
// approved LMS launch) escapes to the top window. The complete fix needs a
// per-request `frame-ancestors` response header, which the client cannot set.
if (!isNativeShell()) breakOutOfUnexpectedFrame();

createRoot(document.getElementById("root")!).render(<App />);
