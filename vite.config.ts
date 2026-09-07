import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  test: {
    // `tests/sso` holds Deno tests (they import from https: URLs) — vitest
    // must never pick them up.
    // tests/e2e is Playwright (browser suite), tests/sso is Deno — neither is Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/sso/**", "tests/e2e/**"],

  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
