/// <reference types="vite/client" />

// ENV-3: build-time constants injected via Vite `define` (vite.config.mjs) from
// the repo-root VERSION file — the single source of truth for the app version.
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
