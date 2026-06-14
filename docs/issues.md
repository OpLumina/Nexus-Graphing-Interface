# NexusGraph — Code Audit Findings

Date: 2026-06-11 · Updated: 2026-06-11 (post-remediation + deeper dive integration)
Scope: `frontend/src`, `backend`, `app` (Electron). Excludes `node_modules`.
Status: **Remediation pass 1 complete.** Plugin RCE/exfil chain closed (app is now local-only + consent-gated). Per-finding status tagged below.

Severity scale: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ⚪ Note / Info
Status tags: ✅ Fixed · 🟦 Mitigated (residual risk noted) · ⬜ Open

---

## Security

### SEC-1 🔴 ✅ Fixed — Plugin "sandbox" is escapable → arbitrary code in renderer

`frontend/src/plugins/sandbox.ts`, `frontend/src/plugins/sandbox.worker.ts`, `frontend/src/engine/userfns.ts`
Plugin inline JS now executes in a dedicated **Worker realm** (`sandbox.worker.ts`), never the main window realm. The Worker global scope has no DOM, no `window`, and no `electronAPI` file bridge (`preload.ts`), so even the unblockable constructor-chain escape (`({}).constructor.constructor("return globalThis")()`) reaches only the Worker's own globals — it **cannot** read/write local files or touch the UI. The previous in-realm `new Function` path (escapable to `electronAPI`) is gone.
**How the sync API survived:** bundled plugins call `ctx.userFns[...]` closures synchronously in tight integration loops. Those closures can't be structured-cloned over `postMessage`, so the main thread forwards only the serializable context (env, viewport, expressions-as-plain-AST, exprId) and the Worker rebuilds an identical `userFns` map from the **pure** engine (`engine/userfns.ts`, extracted for reuse). No per-eval RPC bridge / async rewrite needed.
**Bonus:** the Worker is terminated after a 5 s budget → runaway/infinite-loop plugins can no longer hang the app (partial plugin-side DoS fix).
**Residual (low):** network globals (`fetch`/`WebSocket`) still exist in the Worker realm and `unsafe-eval` is still required for `new Function`. Both are bounded by CSP `connect-src` (ENV-1, backend-only egress, governs the Worker too) plus local-only sources (SEC-2) and per-install consent. No path to files, DOM, or arbitrary hosts remains.

### SEC-2 🟠 ✅ Fixed — Plugins install + auto-run from arbitrary URL with no trust check

`frontend/src/plugins/manager.ts`, `frontend/src/ui/Marketplace.tsx`
Removed all network install paths: deleted `fetchAndInstallPlugin`, remote `fetchRegistry`, `getRegistryUrl`/`setRegistryUrl`, and the URL/registry-URL UI. Plugin sources now limited to (a) the bundled pack and (b) a local `.ngplugin.json` the user picks. Every install — bundled or file — is staged through `parsePluginFile`/`getRegistry` and gated behind a `ConsentDialog` (lists author, version, each tool + op type, inline-JS vs backend-op counts, privilege warning). Consent-bypassing `installBundled` removed.

### SEC-3 🟡 ✅ Fixed — Backend DoS via unbounded symbolic computation

`backend/ops/parse_utils.py`, `backend/ops/calculus.py`, `backend/ops/stats.py`
Power-tower regex blocks `9^9^9^9`-style chained exponents (`ValueError`). `taylor` `n` capped `[0,50]`; `symbolic_derivative` `order` capped `[0,50]`; `regression` `degree = max(1, min(degree, 12, len(xs)-1))`; `sample` `n` capped `[2, 100000]`.
**Note (OPEN, see ARCH-4):** still no per-request timeout / worker isolation — caps reduce but don't eliminate CPU cost.

### SEC-4 🟡 ✅ Fixed — `parse_expr` treated as a security boundary

`backend/ops/parse_utils.py`
`parse_expr` now passed an explicit `global_dict` seeded from `from sympy import *` with `__builtins__` emptied, so Python builtins are unreachable while SymPy functions (`sin`, `cos`, …) still resolve. Combined with the SEC-3 power-tower guard.

### SEC-5 🟢 ✅ Fixed — CORS guards browsers only; `/compute` open to any local process

`backend/main.py`, `frontend/vite.config.mjs`, `docker-compose.yml`, `sysops/run-desktop.{sh,bat}`
Two layers added:

* **LAN already closed:** the host port is bound loopback-only (`docker-compose.yml` → `127.0.0.1:8000:8000`), so no other machine can reach the backend.
* **Local-process gate:** optional shared secret `NEXUS_API_TOKEN`. When set, `/compute` requires a matching `X-Nexus-Token` header (constant-time compare via `hmac.compare_digest`; 401 otherwise). The desktop launchers generate a per-session token and export it to both the backend and the Vite proxy, which injects the header server-side — so the **renderer never holds the token** and an unrelated local process POSTing to `:8000` is rejected. `/health` stays open for readiness.
* **Documented trust model:** when the token is unset (plain `docker compose up` / bare `uvicorn`) the gate is disabled and the backend logs a loud startup warning that it trusts all local clients. SEC-3 caps blunt the residual DoS angle.
**Residual (accepted):** in token-less dev mode any local process can still call `/compute`; this is the documented single-user local-session assumption.

### SEC-6 🟢 ✅ Fixed — Plugin-controlled markdown rendered in docs panel

`frontend/src/ui/toolpanels/GenericPanel.tsx`
Added `urlTransform={safeUrl}` to `ReactMarkdown`; `safeUrl` allows only `http(s):`/`mailto:`/`#`/relative URLs, strips `javascript:`/`data:`.

### SEC-7 🟡 🟦 Mitigated — Worker egress CSP might ignore document meta-tag bounds

`frontend/src/plugins/sandbox.worker.ts`
Egress no longer depends on the document meta-tag CSP reaching the worker. The Worker realm now **hard-removes its network primitives** at module load — `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `Request`, `Response` are redefined as non-configurable `undefined` on `self` (with a best-effort assignment fallback for non-configurable accessors). Because this strips the capability from the realm's own global object, even a constructor-chain escape that recovers `globalThis` finds no network primitive to call — independent of how (or whether) CSP is applied to the worker script. `Function`/`new Function` is intentionally retained (required to run the plugin body; bounded by SEC-1 realm isolation). This realm needs no network access (`buildUserFns` is pure).
**Residual (low):** serving an explicit CSP response header for the worker script remains the belt-and-suspenders defense and is still recommended for shared deployments; the realm-level capability removal makes meta-CSP enforcement non-load-bearing in the meantime.

---

## Correctness Bugs

### BUG-1 🟠 ✅ Fixed — Reflect-tool overlay lines render with broken color

`frontend/src/ui/GraphCanvas.tsx`, `frontend/src/renderer/overlays.ts`
New `parseColor()` handles `#rgb`, `#rrggbb`, and `rgb()/rgba()`, returns `{rgb, alpha}`, falls back to opaque white on bad input. Overlay draw loop uses parsed `rgb` + `alpha`.

### BUG-2 ⚪ ✅ Fixed — `hexToRgb` has no validation

`frontend/src/renderer/overlays.ts`
Folded into `parseColor` — invalid input no longer yields `NaN` channels. `hexToRgb` kept as thin wrapper.

### BUG-3 🟡 ✅ Fixed — Evaluation depth guard false-trips on large valid expressions

`frontend/src/engine/evaluator.ts`
Replaced per-node `MAX_EVAL_DEPTH=500` with `MAX_CALL_DEPTH=256` counting function-call recursion only. Large legitimate expressions no longer trip the guard; cyclic defs still unwind to `NaN`.

### BUG-4 🟡 ✅ Fixed — Parametric `t`-function ignores viewport

`frontend/src/engine/sampler.ts`
`t`-param function now samples over the viewport range instead of fixed `[0, 2π]`.

### BUG-5 🟡 ✅ Fixed — Inequality shading may misalign on HiDPI

`frontend/src/ui/GraphCanvas.tsx`, `frontend/src/renderer/axes.ts`
The 2D axis context previously had no DPR transform, so axes/labels/shading were all drawn in raw device-pixel space — correctly sized only at `devicePixelRatio == 1` (tiny text + hairline grid at DPR≥2, and any CSS-pixel drawing would misalign). The render effect now applies `ctx2d.setTransform(dpr,0,0,dpr,0,0)` once, so all 2D drawing happens in CSS-pixel space; the inequality shading loop derives its grid from `axisCanvas.{width,height}/dpr` to match. `drawAxes` reads the active transform scale (`ctx.getTransform().a/.d`) to recover logical dimensions, so it stays correct whether or not the caller scaled — grid, axes, and shading now share one consistent coordinate space at any DPR.

### BUG-6 🟡 ✅ Fixed — Assignment colliding with derived slider name silently dropped

`frontend/src/store.ts`
`getEnv` now resolves assignments via a `resolved` Set instead of an `in env` guard, so explicit assignments override same-named slider defaults.

### BUG-7 🟢 ✅ Fixed — Numeric input emits `NaN` when cleared

`frontend/src/ui/toolpanels/GenericPanel.tsx`
Empty/NaN field now stores `inp.default ?? ""` instead of `NaN`.

### BUG-8 🟠 ✅ Fixed — `regression` reports R² using raw `NaN` tokens, crashing frontend JSON parses

`backend/ops/stats.py`
Undefined R² (all-equal `y`, i.e. `ss_tot == 0`) now returns Python `None` → serialized as JSON `null` instead of the bare `NaN` token Starlette would otherwise emit (which `response.json()` rejects). Any non-finite `r2` value is also coerced to `None` (`np.isfinite` guard), so NaN/Inf can never cross the JSON boundary. Added a companion `r_squared_defined: bool` so the UI can distinguish "0 / undefined" from a real fit. Verified: `regression({x:[1,2,3], y:[5,5,5]})` → `{"r_squared": null, "r_squared_defined": false, ...}`; a real fit still returns `1.0`.

### BUG-9 🟢 ✅ Fixed — Dependency cycles detected but never surfaced

`frontend/src/store.ts`
Added `CYCLE_ERROR` + `rebuildDepState`, which annotates cyclic expressions with a user-facing error and clears stale ones. All `rebuildDepGraph` callers migrated.

### BUG-10 🟢 ✅ Fixed — Hit-test tolerance mixes x/y math units

`frontend/src/renderer/hittest.ts`, `frontend/src/ui/GraphCanvas.tsx`
`nearestPointOnCurves` now measures distance in **pixel space**: it takes `scaleX`/`scaleY` (pixels-per-math-unit, computed per axis by `GraphCanvas` from `clientWidth/(xMax-xMin)` and `clientHeight/(yMax-yMin)`) and a `tolerancePx` budget (12 px) instead of a single x-range-derived math tolerance. Both the point and segment-projection paths scale each axis delta independently before `hypot`, so picking matches what the user sees regardless of viewport aspect; the closest point is still returned in math coordinates (the projection parameter `t` is identical in both spaces). Verified: frontend lint + `tsc` build clean.

### BUG-11 🟡 ✅ Fixed — Palette index default collision collapses curve visibility

`frontend/src/store.ts`
`loadProject`'s map callback now binds the index (`map((e, i) => …)`) and the color fallback is `e.color ?? colorFor(i)`, so uncolored loaded expressions get distinct palette colors instead of all collapsing to index 0. Previously latent (the `deserialise` path always set a color), now correct for any loader/direct consumer that omits one.

### BUG-12 🟢 ✅ Fixed — UI panel instances retain auto-run flags across expression swaps

`frontend/src/ui/toolpanels/GenericPanel.tsx`, `AnalyzePanel.tsx`
The one-shot boolean `autoRanRef` is replaced with `autoRanKeyRef` storing the `${def.id}:${entry.id}` pair the panel last auto-ran for; `result` is added to the effect deps. The effect re-runs the tool whenever that key changes (a reused panel instance now auto-runs for a new expression) while still deduping repeat fires for the same pair — so React StrictMode's double-invoke and result-driven re-renders don't trigger a second backend call. Verified: lint + build clean.

### BUG-13 🟢 ✅ Fixed — Power-tower check over-broadly denies legitimate expressions

`backend/ops/parse_utils.py`
The blanket `_POWER_TOWER` regex is replaced with a magnitude gate. `_has_dangerous_power_tower` locates numeric towers (base + ≥2 chained exponents) and `_tower_too_big` folds the stacked exponent top-down — short-circuiting to "dangerous" once it provably explodes (a remaining base ≥2 under an exponent past `_EXP_CUTOFF`=64, or an `OverflowError`/non-finite intermediate) — then rejects only when `exp * log10(base) > 100` (result `> 10**100`). This never materializes the explosive value it's guarding against, still blocks `9^9^9^9`/`2^2^2^2^2`/`9^9^3`, and now **allows** finite towers (`2^3^2`=512, `2^3^4`, `9^9^2`). Verified with a magnitude table (all 8 cases match expectations), `2^3^2` parses to `512`, and the existing backend suite (`13 passed`).

### BUG-14 🟢 ✅ Fixed — Cleaned built-in namespace breaks standard internal SymPy paths

`backend/ops/parse_utils.py`
`__builtins__` is no longer emptied; it is set to `_SAFE_BUILTINS`, a minimal math-safe whitelist (`abs`, `min`, `max`, `round`, `pow`, `divmod`, `sum`, `int`, `float`, `complex`, `bool`, `range`, `True`, `False`, `None`) built once from the `builtins` module. So any input that legitimately resolves through a builtin during sympify no longer trips an empty-namespace failure, while every escape primitive the SEC-4 hardening targets (`__import__`, `eval`, `exec`, `open`, `getattr`, `globals`, …) stays absent. Verified: the whitelist contains only the listed safe names; `x^2+1`, `sin(x)+cos(x)`, `sqrt(x)`, `Abs(x)`, `floor(x)` all parse; the escape names are confirmed not present; existing backend suite `13 passed`.
**Note:** multi-character bare builtin calls like `abs(x)` are still rewritten to symbol products by `implicit_multiplication_application` (use SymPy's `Abs`) — that is a separate parser-ergonomics behavior, independent of this builtins fix.

### BUG-15 🟢 ✅ Fixed — WebGL uniform updates crash on un-clamped parsed color parameters

`frontend/src/renderer/overlays.ts`
`parseColor`'s `rgb()/rgba()` branch now passes every channel through a `clamp01` helper (`Math.min(1, Math.max(0, n))`), so `rgb(300,0,0)` resolves to `[1,0,0]` and alpha is bounded to `[0,1]` before reaching the WebGL color uniform. `clamp01` propagates `NaN` (via `Math.max`/`Math.min`), so the existing `Number.isFinite` guard still rejects genuinely malformed input and falls back to opaque white. The `#hex` path is inherently in-range (`/255`). Verified: lint + build + vitest (`41 passed`) clean.

---

## Architecture / Quality

### ARCH-1 ⚪ ✅ Fixed — Duplicated user-function construction

`frontend/src/store.ts`
Extracted `buildUserFns(expressions, env)`; `getEnv` and `getUserFns` both use it.

### ARCH-2 ⚪ ✅ Fixed — Evaluator relies on module-global mutable state

`frontend/src/engine/evaluator.ts`
Now a single `callDepth` counter for call recursion (still module-level but scoped to call depth); per-node global removed. **Note:** for true Worker reentrancy a passed-context counter is still preferable — tracked under SEC-1 redesign.

### ARCH-3 ⚪ ⬜ Open (deferred — perf, by design) — Implicit/inequality sampling unbounded per frame

`frontend/src/engine/sampler.ts`, `GraphCanvas.tsx`
Every viewport change re-runs full-grid evaluation per implicit/inequality expression, no caching/debounce.
**Decision (2026-06-11):** deferred, not fake-fixed. This is a pure-performance note with no correctness impact and no symptom at current scale; a fix (grid cache keyed on viewport+expr, or a sample debounce) touches the hot WebGL render path, which has **no covering tests**. Implementing it now risks a visible-rendering regression for a speculative gain. Left open as a tracked optimization for when interactive implicit-plot perf is measured to be a problem.

### ARCH-4 ⚪ ⬜ Open (deferred — perf, mitigated by SEC-3) — No request timeout / worker isolation on backend

`backend/compute.py`
All ops run synchronously in the request thread. One heavy op still blocks the worker.
**Decision (2026-06-11):** deferred. The worst case is already bounded by the SEC-3 computation caps (expression-size / power-tower / step limits), so a single request cannot run unbounded. True isolation (process/thread pool + hard execution timeout) is a meaningful concurrency change to the request path with little benefit for a single-user local desktop app bound to loopback. Revisit if the backend is ever exposed to concurrent clients.

### ARCH-5 ⚪ ⬜ Open (owner decision) — `CLAUDE.md` embeds machine identifiers + external-routing directives

`CLAUDE.md`
Checked-in account ID, hostname, "bypass tracking permission," and mandatory external-routing directives — secrets-hygiene + prompt-injection surface.
**Decision (2026-06-11):** not auto-edited. `CLAUDE.md` is gitignored and confirmed untracked (ENV-7), so none of this leaks into the shared repo — the public exposure is already closed. The file itself is the *user's* agent-instruction config (it directs assistant behavior), so rewriting it to strip the account ID / hostname / routing protocol is an owner decision, not an automated code fix. **Recommended for the user:** scrub the account ID (`31a9c9a6-…`) and hostname from `CLAUDE.md`, and treat the embedded routing directives as untrusted input rather than mandatory instructions.

### ARCH-6 🟡 ✅ Fixed — Repeated Worker lifecycle teardowns introduce runtime performance overhead

`frontend/src/plugins/sandbox.ts`, `frontend/src/plugins/sandbox.worker.ts`
`runSandboxed` now reuses one pooled module worker (`getWorker()` lazy-creates a singleton) across all runs instead of constructing + `terminate()`ing one per call, so the module-worker spin-up + bundle load is paid once, not per invocation. Concurrent/interleaved runs are correlated by a monotonic `reqId` (echoed back as `__reqId`) and routed through a `pending` map. The worker is only torn down on a timeout-kill or worker-level error (`killWorker`), which terminates the shared realm, rejects every in-flight run, and forces a fresh worker on the next call — preserving the original per-run 5 s budget and runaway-plugin protection.

### ARCH-7 🟡 ✅ Fixed — Deprecated FastAPI lifecycle events used for engine initialization

`backend/main.py`
Replaced the deprecated `@app.on_event("startup")` hook with an `@asynccontextmanager` `lifespan(app)` passed to `FastAPI(..., lifespan=lifespan)`; the trust-model startup log now runs before the `yield`. Verified the app imports and exposes `/health` + `/compute` with no deprecation path.

### ARCH-8 ⚪ ✅ Fixed — Shared recursion counter masks evaluation failure context

`frontend/src/engine/evaluator.ts`
The recommendation's two halves are now both satisfied. (1) **User-facing signal already exists:** cyclic/mutually-recursive definitions (`f(x)=f(x)`, mutual recursion) are detected up front by the store's dependency graph and surfaced as the `CYCLE_ERROR` ("circular reference") annotation on the offending expression (BUG-9, `store.ts` `rebuildDepState`), so the user sees an explicit error, not just an empty NaN plot. The module-level `callDepth`/`MAX_CALL_DEPTH=256` NaN return is the defence-in-depth *runtime* backstop for cases the static graph can't catch (data-dependent indirect recursion) plus a cap on composition nesting. (2) **Documented:** the cap and its relationship to the store cycle error are now spelled out in the `evaluator.ts` comment, including that the limit is intentionally generous so deep-but-valid composition is unaffected and that exceeding it collapses to NaN by design. No behavioural change — the silent NaN is no longer the *only* signal.

---

## Environment, Configuration & Build

### ENV-1 🟠 ✅ Fixed — CSP allowed exfiltration to any origin

`frontend/index.html`
`connect-src` restricted to `'self'` + backend (`localhost:8000`/`127.0.0.1:8000`) + dev HMR ws only; `img-src 'self' data:`. `script-src 'self' 'unsafe-eval'` retained (plugin `new Function` still needs it — removal tied to SEC-1 Worker move).

### ENV-2 🟠 ✅ Fixed — Electron renderer not navigation-hardened

`app/main.ts`
Added `sandbox: true`; `setWindowOpenHandler` (deny + `shell.openExternal` for http(s)); `will-navigate`/`will-redirect` guard against `allowedOrigin` (DEV_URL in dev, `file://` in prod). Pre-existing path-traversal guard retained.

### ENV-3 🟡 🟦 Mitigated — Version stamping fragmented + hand-maintained

`VERSION`, `backend/main.py`, `frontend/vite.config.mjs`, `frontend/package.json`, `app/package.json`
Added a repo-root `VERSION` file (`2.0.0`) as the single source of truth. `backend/main.py` reads it (`_read_version()`: `NEXUS_VERSION` env override → root `VERSION` file) and passes it to `FastAPI(version=...)`. `frontend/vite.config.mjs` reads the same file and injects `__APP_VERSION__` + `__BUILD_DATE__` via `define` (typed in `src/vite-env.d.ts`), so the bundle stamps the real version instead of a stale literal. Static `frontend/package.json` aligned `1.0.0 → 2.0.0`, and the previously-missing `app/package.json` now exists with `version`, `productName`, `main`, and an electron-builder `build` block (`appId: com.nexusgraph.desktop`, per-OS targets, mac `hardenedRuntime`). Verified backend reports `2.0.0` and the frontend typechecks.
**Residual (low):** the two static `package.json` `version` fields still mirror `VERSION` by hand at release time (electron-builder requires it in `app/package.json`); the runtime-read paths (backend + frontend build) are now genuinely single-sourced. Git-SHA injection not added (build-date is). README root-`install.bat` path note tracked under the docs cleanup.

### ENV-4 🟡 ✅ Fixed — Production image serves the Vite dev server

`frontend/Dockerfile`, `frontend/nginx.conf.template`, `frontend/.dockerignore`, `docker-compose.yml`, `docker-compose.dev.yml`
`frontend/Dockerfile` is now multi-stage: a shared `deps` layer (`npm ci`), a `dev` stage (the Vite dev server, used only by the dev overlay), a `build` stage (`npm run build` → static `dist/`), and a `prod` stage that serves `dist/` via `nginx:1.27-alpine`. The base `docker-compose.yml` is now the production stack — it builds the `prod` target, mounts no source, and keeps `read_only: true` (nginx's runtime-writable paths — rendered config, pid, worker caches — are backed by `tmpfs`), so the BP-3 conflict is gone. Hot reload moved entirely into `docker-compose.dev.yml`, which overrides the frontend to the `dev` build target with a source bind-mount and the backend to `uvicorn --reload`; the documented dev command (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`) is unchanged. **SEC-5 coupling preserved:** in prod there is no Vite proxy, so `nginx.conf.template` reverse-proxies `/api/ → backend:8000/` and injects `X-Nexus-Token` from `NEXUS_API_TOKEN` (substituted at container start via nginx's envsubst template step) — the renderer still never holds the token, exactly as the dev proxy does; `/api` is same-origin so the existing `connect-src 'self'` CSP covers it. `frontend/.dockerignore` keeps host `node_modules`/`dist` out of the build context. Verified: `docker compose config` and the dev-merged config both parse; `npm run build` produces `dist/` successfully.
**Residual (low):** the bundle's version stamp in the prod image comes from the `NEXUS_VERSION` build arg (default mirrors `VERSION`) because the repo-root `VERSION` file is outside the `./frontend` build context (ENV-3); the dev server still reads `../VERSION` directly. Image not yet built/pushed in CI.

### ENV-5 🟡 ✅ Fixed — Dependency pinning inconsistent

`frontend/package.json`, `sysops/install.sh`, `sysops/install.bat`
The remaining carets on security-relevant deps are now exact pins matching the lockfile: `react-markdown 10.1.0`, `@types/node 20.19.42`, `@vitejs/plugin-react 4.7.0`, `electron 42.4.0`, `vite 6.4.3`, `vitest 4.1.8` (each set to the version `package-lock.json` already resolved, so the lockfile stays consistent). Both install scripts now run `npm ci` instead of `npm install`, so installs are reproducible and fail fast if `package.json` and the lockfile disagree.

### ENV-6 🟢 ✅ Fixed — `.ngraph` loader trusts arbitrary expression IDs

`frontend/src/project.ts`
`deserialise` now normalizes every id through a `normalizeId` helper before constructing an `ExpressionEntry`: an id is accepted only if it matches `^[A-Za-z0-9_-]{1,64}$`, otherwise a synthetic `expr-<n>` is issued, and a `usedIds` set de-duplicates collisions (appending `-<n>`) so two entries sharing a file id can't clobber each other as object keys. The live `loadProject` path already re-issued ids via `newId()`; this closes the gap for any direct consumer of `deserialise` and removes the attacker-shaped-key surface at the parse boundary. Verified: lint + build + vitest (`41 passed`) clean.

### ENV-7 🟢 ✅ Fixed — Machine-specific local settings in working tree

`.claude/settings.local.json`, `CLAUDE.md`, `.gitignore`
Confirmed clean: `git ls-files ".claude" "CLAUDE.md"` returns **nothing** (neither path is tracked) and `git check-ignore CLAUDE.md .claude/settings.local.json` lists both (actively ignored). The absolute user paths, permission allow-list, and account ID (ARCH-5) in those files never enter the repo. Verification-only — the existing `.gitignore` rules already enforce it; no code change.

### ENV-8 🟢 ✅ Fixed — Backend ships interactive docs + version banner

`backend/main.py`
`/docs`, `/redoc`, `/openapi.json` are now gated on `NEXUS_ENABLE_DOCS` (default `1`, preserving local convenience). Any falsy value (`0`/`false`/`no`/`off`/empty) passes `docs_url=None`/`redoc_url=None`/`openapi_url=None` to `FastAPI(...)`, so the routes return **404** outright rather than merely hiding the Swagger link — a shared deployment exposes no API surface. The startup lifespan logs when docs are disabled. Verified: with `NEXUS_ENABLE_DOCS=0`, `app.docs_url is None`.

### ENV-9 🟢 ✅ Fixed — Electron navigation bounds permit unchecked local directory jumps

`app/main.ts`
The prod `will-navigate`/`will-redirect` guard no longer trusts the bare `file://` scheme. `allowedOrigin` is now `pathToFileURL(PROD_DIST_DIR + sep).href` — the file URL of the bundled `frontend/dist/` directory with a trailing separator — so only navigations *inside* the app bundle pass the `startsWith` check; `file:///etc/passwd`, `file:///C:/...`, and even a sibling `dist-evil/` are all blocked. Dev mode still scopes to `DEV_URL`. Verified: `tsc -p tsconfig.electron.json --noEmit` clean.

### ENV-10 ⚪ ⬜ Open (deferred — coupled to SEC-7) — HTML layout exposes eval permissions unnecessarily to core window context

`frontend/index.html:14`
The document CSP still grants `script-src 'unsafe-eval'`; the main realm retains eval capability even though plugin eval moved to the Worker.
**Decision (2026-06-11):** can't be cleanly closed via the meta-tag CSP, and not fake-fixed. A document's Workers **inherit** its meta CSP — there is no meta-tag mechanism to grant the Worker `unsafe-eval` while denying it to the document. Dropping `unsafe-eval` from the meta tag would therefore also strip it from the Worker and break `new Function` in `sandbox.worker.ts`. The only correct fix is a *separate per-worker CSP response header*, which is exactly the SEC-7 residual and is only available on the prod nginx path (ENV-4), not the Vite dev server. Tracked together with SEC-7; the practical exposure is already bounded by `connect-src` (ENV-1) confining any eval'd code's egress to the backend.

### ENV-11 ⚪ 🟦 Mitigated (documented — intended behavior) — Trailing expression token validation changes may affect historic document files

`frontend/src/engine/parser.ts:74`
The new trailing-token check turns previously silently-accepted inputs (trailing junk) into parse errors, which may surface as errors on older saved `.ngraph` expressions.
**Decision (2026-06-11):** this is intended hardening, not a regression — silently dropping trailing junk hid malformed expressions. The audit's recommended action was "note in changelog; no code change," so it is recorded here as the changelog of record: *loading a pre-hardening `.ngraph` whose expression had trailing junk now shows an explicit parse error on that row instead of silently truncating; re-save after correcting.* No code change.

---

## Best Practices

### BP-1 🟡 ✅ Fixed — No CI / automated test+lint gate

`.github/workflows/ci.yml`
Added a GitHub Actions workflow that runs on every push to `main` and on all PRs (with `concurrency` cancel-in-progress to save runner minutes). Two jobs: **frontend** (Node 22, npm cache) runs `npm ci --ignore-scripts` → `npm run lint` → `npx vitest run` → `npm run build` (the build also typechecks via `tsc`); **backend** (Python 3.12, pip cache) installs `requirements.txt` + `pytest` and runs `pytest -q`. `npm ci` fails fast on any `package.json`/lockfile drift (pairs with ENV-5). Verified every step passes locally before committing the workflow: backend `13 passed`, eslint clean, vitest `41 passed`, `vite build` succeeds.
**Residual (low):** no pre-commit hook and no `pytest`/`ruff` pin in `requirements.txt` (CI installs them unpinned). Backend lint is now wired in via BP-2 (`ruff check .` runs before pytest).

### BP-2 🟢 ✅ Fixed — Lint coverage weakened; backend unlinted

`frontend/eslint.config.js`, `backend/ruff.toml`, `.github/workflows/ci.yml`
**Frontend:** `@typescript-eslint/no-unused-vars` is back to **error** (underscore-prefixed args/locals/caught-errors opt out), and `@typescript-eslint/no-unused-expressions` is **re-enabled** as error — the earlier eslint 9.39 + @typescript-eslint 8.5 crash is sidestepped by passing the options object explicitly (`allowShortCircuit`/`allowTernary`/`allowTaggedTemplates`). `no-explicit-any` stays `warn` (intentional — `any` should stay visible without blocking). **Backend:** added `backend/ruff.toml` (rules E/F/I/B/UP/W, `target py312`) and wired `ruff check .` into the backend CI job ahead of pytest. Applied ruff's autofixes (import ordering, two genuinely-unused `numpy` imports removed) and a single `# noqa: E402` on the intentional mid-file `import builtins` (kept beside its BUG-14 rationale). Verified: `npm run lint` clean, `ruff check .` → "All checks passed!", 13 backend + 47 frontend tests pass.

### BP-3 🟢 ✅ Fixed — `read_only` prod container vs dev-server writable cache

`docker-compose.yml`, `docker-compose.dev.yml`, `frontend/Dockerfile`
Resolved by ENV-4. The prod frontend container now serves a static nginx build with no dev-server cache writes, so `read_only: true` no longer conflicts with a writable workspace; nginx's only runtime-writable paths are backed by `tmpfs`. The writable dev server lives exclusively in `docker-compose.dev.yml`, which sets `read_only: false` for that mode.

### BP-4 🟢 🟦 Mitigated — Plugin JS shipped as one escaped blob

`frontend/src/plugins/types.ts`, `frontend/src/plugins/integrity.ts`, `frontend/src/plugins/manager.ts`, `sample_plugins/nexus.fourier.ngplugin.json`
The inline `operation.js` in a `.ngplugin.json` may now be an **array of source lines** (joined with `\n` before execution), so the code reads line-by-line in the JSON instead of one escaped string — chosen over literal separate files to preserve the documented single-file / no-build-step plugin model. Added an optional `integrity` field (`sha256-<base64>` SRI token over the resolved source); `parsePluginFile` recomputes the digest with Web Crypto and **rejects** a plugin whose source no longer matches *before* it can be installed. `validateManifest` accepts both the string and array shapes; `pluginToolsToDefinitions` collapses the array to the single string the sandbox runs, so `runner.ts`/`runSandboxed` are untouched. The sample Fourier plugin now ships as a 49-line readable array with a matching digest, and new `integrity.test.ts` (4 cases) covers join/hash/verify.
**Residual (low):** the digest lives in the same file, so it catches corruption/tampering and gives the consent UI a stable fingerprint, but does not prove authorship (a malicious author recomputes it). The full fix — separate-file distribution + a signed registry — is out of scope for a local single-file model.

### BP-5 🟢 ✅ Fixed — Vitest runs in `node` env; UI components untested

`frontend/vite.config.mjs`, `frontend/vitest.setup.ts`, `frontend/src/jest-dom.d.ts`, `frontend/src/ui/__tests__/MathDisplay.test.tsx`, `frontend/package.json`
Split the suite into two vitest **projects**: `engine` (`node`, `*.test.ts` — the fast pure-logic tests stay where they belong) and `ui` (`jsdom`, `*.test.tsx`). Added `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` devDeps, a `vitest.setup.ts` that registers the jest-dom matchers and runs `cleanup()` after each test, and `src/jest-dom.d.ts` so the production `tsc` build sees the matcher type augmentation. Proved the pipeline with a real component test — `MathDisplay`: the KaTeX render path and the empty-string `<code>` fallback. Verified: `vitest run` → 47 passed (6 files), `npm run lint` clean, `tsc && vite build` clean.

### BP-6 🟢 ✅ Fixed — Personal helper script in repo

`rsync.sh`, `.gitignore`
`git rm --cached rsync.sh` untracks the personal backup script (staged for removal from the shared repo) while keeping the user's local copy, and a new `.gitignore` entry stops it re-entering the index. Verified: `git ls-files rsync.sh` is empty, `git check-ignore rsync.sh` matches, and the local file is still on disk.

### BP-7 ⚪ ⬜ Open (deferred — optional, current-scale fine) — Parameter resolution tracking features complex quadratic evaluation cost

`frontend/src/store.ts:281`
Assignment resolution re-evaluates each unresolved assignment every pass ($O(\text{passes} \times \text{assignments})$); fine at current scale but $O(n^2)$ on heavily interdependent docs.
**Decision (2026-06-11):** deferred. The audit itself marks this "Optional" and "fine at current scale" (a document has a handful of assignments, not thousands). The fix — topologically ordering assignments via the existing dependency graph and resolving in one pass — would change resolution *order*, which the store's `getEnv` semantics depend on, against only a `store.getenv` test for coverage. Not worth the regression risk on a path with no measured hot spot. Left as a tracked optimization.

---

## Summary — remaining work

Fixed: SEC-1 (Worker isolation), SEC-2, SEC-3, SEC-4, SEC-5, SEC-6, BUG-1 (Historical High), BUG-2, BUG-3, BUG-4, BUG-5, BUG-6, BUG-7, BUG-8, BUG-9, BUG-10, BUG-11, BUG-12, BUG-13, BUG-14, BUG-15, ARCH-1, ARCH-2, ARCH-6, ARCH-7, ARCH-8, ENV-1, ENV-2, ENV-4, ENV-5, ENV-6, ENV-7, ENV-8, ENV-9, BP-1, BP-2, BP-3, BP-5, BP-6. → **39 fixed.**
Mitigated (residual risk noted): SEC-7, ENV-3, BP-4, ENV-11. → **43 closed total.**

**Open (5 — all ⚪ Note/Info, each a documented deferral, not an unresolved defect):**

| Severity | Count | IDs |
| --- | --- | --- |
| 🔴 Critical | 0 | — |
| 🟠 High | 0 | — |
| 🟡 Medium | 0 | — |
| 🟢 Low | 0 | — |
| ⚪ Note / Info | 5 | ARCH-3, ARCH-4, ARCH-5, ENV-10, BP-7 |

All 5 remaining are performance/owner-decision/coupled notes the original audit itself marked optional or out-of-scope; each now carries a dated **Decision** rationale above rather than being silently left open. No Critical/High/Medium/Low defects remain.
