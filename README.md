# NexusGraph

A next-generation graphing calculator and mathematical research platform. Symbolic computation, implicit curves, inequality shading, and an extensible plugin system — built for mathematics and scientific research.

---

## Quick Start

### Desktop app (Windows)

> **Requires:** Docker Desktop running before launch. `run-desktop.bat` checks the Docker API on startup and shows an error dialog if it is not reachable.

```bat
sysops\install.bat
sysops\run-desktop.bat
```

Background services (backend container, Vite dev server) start without opening extra terminal windows. Errors surface as dialog boxes. Close the Electron window to shut everything down cleanly.

### Desktop app (Linux / macOS)

```bash
./sysops/install.sh
./sysops/run-desktop.sh
```

To remove all installed dependencies and build artifacts:

```bat
sysops\uninstall.bat       # Windows
./sysops/uninstall.sh      # Linux / macOS
```

### Browser / Docker (full stack)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

Both services hot-reload on file save.

---

## What you can graph

| Expression | What renders |
|---|---|
| `y = x^2` | Parabola |
| `f(x) = sin(x)` | Named function |
| `x^2 + y^2 = 25` | Circle (implicit) |
| `y^2 = x^3 - x` | Elliptic curve (implicit) |
| `y < sin(x)` | Inequality region (shaded) |
| `x(t) = cos(t)` + `y(t) = sin(t)` | Parametric |
| `r(θ) = 2sin(3θ)` | Polar rose |
| `a = 3` then `y = ax + b` | Live sliders for `a` and `b` |
| `g(x) = f(x + 1)` | Cross-function composition |
| `reflect(f, g)` | Reflection vector tool |

---

## Tools

Every expression row has a **≡** toggle that opens output panels. Available tools:

| Tool | What it does |
|------|-------------|
| **Value table** | f(x) at x ∈ {-2,-1,0,1,2} |
| **Slope** | f′(x) numerically + tangent line overlay |
| **Derivative** | Symbolic f′(x) rendered as LaTeX |
| **Taylor series** | Expansion to order N around any point |
| **Definite integral** | ∫ₐᵇ f dx — exact, numeric, antiderivative |
| **Limit** | lim_{x→a} f(x) with direction control |
| **Analyze** | Roots, classified critical points, inflection points, f″(x) |
| **Reflect** | Reflection vector at intersection of two curves |

---

## Function palette

The **FUNCTIONS** bar at the bottom of the window inserts any built-in at the cursor: full trig (`sin` … `arccot`, `atan2`), hyperbolics and their inverses (`sinh` … `coth`, `arctanh`), roots (`sqrt`, `cbrt`, `nthroot(x, n)`), logs (`ln`, `log`, `log2`, `logb(x, b)`), rounding (`floor`, `ceil`, `round`, `trunc`, `frac`), discrete math (`factorial`, `gamma`, `ncr`, `npr`, `gcd`, `lcm`), and utilities (`mod`, `clamp`, `hypot`, `sinc`, `step`, `deg`, `rad`). All of these also parse directly in expressions, e.g. `y = nthroot(x, 5)` or `f(x) = arctan(x) * gamma(x)`.

---

## Plugin Marketplace

Click **Plugins** in the top bar to browse, install, and manage plugins. Everything is free.

Plugins are single `.ngplugin.json` files — no build step, no server deploy required for pure-JS tools.

### Bundled plugin pack (works offline)

The **Browse** tab lists a plugin pack that ships with the app — installing copies the manifest into local storage, no network needed:

| Plugin | What it adds |
|---|---|
| Arc Length | ∫√(1 + f′²) dx on [a, b] |
| Average Value | Mean value of f on [a, b] + overlay line |
| Curvature | κ, radius, osculating circle center at a point |
| Custom Value Table | f(x) tabulated over any range/step |
| Euler's Method | Step y′ = f(x) from an initial condition |
| Extrema Finder | Local min/max in the visible viewport |
| Fourier Series | aₙ/bₙ coefficients + LaTeX partial sum |
| Function Statistics | mean, std dev, min, max, RMS of f on [a, b] |
| Inverse Solver | All x in view with f(x) = c |
| Riemann Sums | Left/right/midpoint/trapezoid comparison |
| Root Finder (Newton) | Newton's method from a guess |
| Secant Line | Average rate of change + overlay |
| Tangent & Normal | Tangent and normal lines at x₀ |

### Installing a plugin

1. Click **Plugins** → **Browse** and hit **Install** (bundled pack, offline), or **Import** to paste a URL / drop a `.ngplugin.json` file
2. Reload the page — plugin tools appear automatically on applicable expressions
3. **Installed** tab: **Disable**/**Enable** toggles a plugin without uninstalling; **Remove** deletes it

### Writing a plugin

```json
{
  "id": "your-name.plugin-name",
  "version": "1.0.0",
  "name": "My Tool",
  "author": "Your Name",
  "description": "What this does",
  "tags": ["calculus"],
  "tools": [{
    "id": "my_tool",
    "label": "My Tool",
    "category": "calculus",
    "appliesTo": ["function", "expression"],
    "inputs": [{ "name": "n", "type": "number", "default": 5 }],
    "operation": {
      "type": "inline",
      "js": "function run(inputs, ctx) { return { ok: true, data: { result: inputs.n } }; }"
    },
    "outputs": {
      "panel": [{ "type": "value", "label": "result", "value": "result.result" }]
    }
  }]
}
```

The `run(inputs, ctx)` function has access to `Math`, `utils` (linspace, range, sum, mean), and the full expression context (`ctx.env`, `ctx.userFns`, `ctx.viewport`).

For backend-powered plugins, drop a `.py` file with `OPS = {"op_name": fn}` in `backend/plugins/` — it registers automatically on the next server restart.

See `sample_plugins/nexus.fourier.ngplugin.json` for a complete working example (Fourier series coefficients).

---

## Navigation

| Action | How |
|--------|-----|
| Pan | Click and drag on the graph |
| Zoom | Scroll wheel |
| Hide/show curve | Click the color dot |
| Remove expression | Click × |
| Command palette | **Ctrl+Shift+P** or top-bar **Menu** button |
| Open/Save (.ngraph) | Top bar buttons (Electron only) |
| Move window | Click and drag the top bar (Electron only) |
| Minimize / Maximize / Close | Top-right window control buttons (Electron only) |

---

## Backend API

Single endpoint — all math operations dispatch through it:

```
POST /compute
{ "op": "op_name", "inputs": { ... } }
```

| Op | Description |
|----|-------------|
| `numeric_derivative` | Central-difference slope at a point |
| `symbolic_derivative` | SymPy derivative, returns LaTeX |
| `taylor_series` | Taylor/Maclaurin expansion |
| `definite_integral` | ∫ₐᵇ f dx, exact + numeric |
| `limit` | lim_{x→a} f(x) |
| `solve` | Roots of f(x) = 0 |
| `factor` / `expand` / `simplify` | Symbolic algebra |
| `integral` | Indefinite antiderivative |
| `analyze_function` | Roots, critical points, inflections |
| `reflect_vector` | Intersection + reflection angles |
| `sample` | Evaluate f over a range |
| `regression` | Polynomial curve fit |

Full interactive docs: http://localhost:8000/docs

### Example

```bash
curl -X POST http://localhost:8000/compute \
  -H "Content-Type: application/json" \
  -d '{"op": "taylor_series", "inputs": {"expr": "sin(x)", "n": 5, "a": 0}}'
```

```json
{
  "ok": true,
  "result": {
    "latex": "x - \\frac{x^{3}}{6} + \\frac{x^{5}}{120}",
    "order": 5,
    "around": 0
  }
}
```

---

## Project Structure

```
nexus-graphing-interface/
├── frontend/src/
│   ├── engine/         Pure math — parser, evaluator, sampler
│   ├── renderer/       WebGL — curves, axes, overlays
│   ├── tools/          Tool definitions (*.tool.md) + runner
│   ├── plugins/        Plugin sandbox, manager, types
│   ├── api/            Backend client
│   └── ui/             React components + toolpanels
├── backend/
│   ├── ops/            Math operations by category
│   └── plugins/        Drop .py files here to add backend ops
├── sample_plugins/     Example .ngplugin.json files
└── app/                Electron desktop shell
```

---

## Security

### Quick audit

```bash
cd frontend && npm audit          # check JS deps
cd frontend && npm audit fix      # auto-fix patch-level vulns
pip install pip-audit && pip-audit -r backend/requirements.txt
```

### Known advisories (devDependencies only — no production impact)

| Package | Severity | Advisory | Fixed in |
|---------|----------|----------|----------|
| `esbuild ≤0.24.2` (via vite) | Moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server accepts cross-origin requests | vite 5.4.21 ✅ (package.json updated) |
| `@eslint/plugin-kit ≤0.3.3` | Low | [GHSA-7q7g-4xm8-89cq](https://github.com/advisories/GHSA-7q7g-4xm8-89cq) — ReDoS in lint config parser | eslint 9.39.4 ✅ (package.json updated) |

Run `npm install` after pulling to apply the bumped versions.

### Production deployment checklist

**Backend CORS** — `backend/main.py` defaults to `allow_origins=["*"]` for local dev. Lock it down before exposing the API publicly:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],   # explicit origin list
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)
```

**Backend input limits** — the `/compute` endpoint passes user expressions directly to SymPy. Without limits, a complex expression can peg the CPU indefinitely. Add a timeout wrapper or use `anyio`'s `move_on_after`:

```python
# backend/compute.py — wrap dispatch with a timeout
import anyio

async def dispatch_with_timeout(req, timeout=10.0):
    with anyio.move_on_after(timeout):
        return dispatch(req)
    return ComputeResponse(ok=False, error="Computation timed out")
```

**Backend expression length guard** — add to `dispatch()`:

```python
if len(req.inputs.get("expr", "")) > 500:
    return ComputeResponse(ok=False, error="Expression too long")
```

**Docker networking** — in production, bind the backend to `127.0.0.1` only and proxy through nginx. Remove `- "8000:8000"` from `docker-compose.yml` and add an nginx reverse proxy instead.

**CSP header** — plugin inline JS requires `unsafe-eval`. If deploying to the web, add a strict CSP via nginx and remove `unsafe-eval` if you disable the plugin system:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'
```

### Plugin security model

Plugins execute user-provided JavaScript via `new Function()`. The sandbox:
- Blocks `window`, `document`, `globalThis`, `self`, `location`, `fetch`, `XMLHttpRequest` (shadowed to `undefined`)
- Restricts `Math` to a safe read-only subset
- Runs under `"use strict"` (removes implicit `this`)

**Limitations** — `new Function()` is not a true isolate. Prototype chain escapes (`Object.getPrototypeOf` tricks) can still reach the outer realm in some JS engines. For a multi-tenant or public deployment, replace `sandbox.ts` with a Worker + MessageChannel sandbox instead.

Only install plugins from sources you trust.

---

## Roadmap

| Phase | Status | Features |
|-------|--------|---------|
| 1 | ✅ Done | Cartesian, parametric, polar, sliders, save/load |
| 2 | ⚠️ Partial | Implicit curves ✅, inequality shading ✅, tool system ✅, KaTeX ✅, plugin marketplace ✅ — regression UI ❌, geometry engine ❌, complex plane ❌, vector fields ❌, ODE direction fields ❌ |
| 3 | Planned | Notebook system, large dataset engine, advanced symbolics, plugin marketplace expansion |
| 4 | Planned | 3D graphing, collaborative features |
