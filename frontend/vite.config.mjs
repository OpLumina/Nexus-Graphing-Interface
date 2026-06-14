import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ENV-3: single source of truth for the version — read the repo-root VERSION
// file (one level up from frontend/) so the bundle stamps the same number as the
// backend and Electron app instead of the stale frontend package.json "1.0.0".
function appVersion() {
  try {
    return readFileSync(fileURLToPath(new URL("../VERSION", import.meta.url)), "utf-8").trim();
  } catch {
    return process.env.NEXUS_VERSION?.trim() || "0.0.0";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: {
    port: 5173,
    // Bind exactly :5173 or exit — never silently move to :5174. Electron loads
    // a fixed dev URL, so a drifting port left it connecting to whatever stale
    // server happened to hold :5173 (see app/main.ts NEXUS_DEV_URL note).
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
        changeOrigin: true,
        // SEC-5: inject the shared backend token server-side so the renderer
        // never holds it. The launcher exports NEXUS_API_TOKEN to both this
        // proxy and the backend; a different local process hitting :8000
        // directly has no token and is rejected.
        configure: (proxy) => {
          const token = process.env.NEXUS_API_TOKEN;
          if (token) {
            proxy.on("proxyReq", (proxyReq) => proxyReq.setHeader("X-Nexus-Token", token));
          }
        },
      },
    },
  },
  // BP-5: split the suite into two projects so pure-logic tests stay fast in the
  // `node` environment while React/UI tests get a real DOM (`jsdom`). Both inherit
  // the root config (the react plugin, version `define`s) via `extends: true`.
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "engine",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
