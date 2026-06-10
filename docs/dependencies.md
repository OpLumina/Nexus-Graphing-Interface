# Dependency Audit

Last updated: 2026-06-08  
Auditor: automated review via `npm audit` + manual assessment

---

## Frontend (`frontend/package.json`)

### Production dependencies

| Package | Version | Purpose | Why this package |
|---------|---------|---------|-----------------|
| `react` | 18.3.1 | UI framework | Component model, reconciler, hooks |
| `react-dom` | 18.3.1 | DOM renderer for React | Pairs with react for browser rendering |
| `zustand` | 5.0.0 | Global state management | Minimal store — no boilerplate, no context wrapping. Replaced Redux/Context for expression list, sliders, tool results, viewport |
| `katex` | 0.16.47 | LaTeX math rendering | Client-side TeX → HTML/SVG. Used in `MathDisplay.tsx` to render symbolic results from the backend |
| `react-markdown` | ^10.1.0 | Markdown renderer | Renders tool `.tool.md` doc bodies and plugin documentation strings inside tool panels |

### Development dependencies

| Package | Version | Purpose | Why this package |
|---------|---------|---------|-----------------|
| `vite` | 5.4.21 | Build tool + dev server | Fast HMR, native ESM, Rollup bundler for production. Vite glob import used by tool loader (`import.meta.glob("*.tool.md")`) |
| `@vitejs/plugin-react` | 4.3.1 | Vite plugin for React | Babel/SWC fast-refresh transform for `.tsx` files |
| `typescript` | 5.5.4 | Type checker | Compile-time safety across engine, store, and UI layers |
| `eslint` | 9.39.4 | Linter | Code quality, catches common mistakes |
| `@typescript-eslint/eslint-plugin` | 8.5.0 | TypeScript ESLint rules | Enables TS-aware lint rules |
| `@typescript-eslint/parser` | 8.5.0 | TypeScript ESLint parser | Parses `.ts`/`.tsx` for ESLint |
| `vitest` | 2.1.1 | Test runner | Vite-native test framework. Same config as dev build — no separate babel setup |
| `@types/react` | 18.3.5 | React type definitions | TypeScript types for JSX and React APIs |
| `@types/react-dom` | 18.3.0 | React DOM type definitions | TypeScript types for ReactDOM |
| `@types/katex` | 0.16.7 | KaTeX type definitions | TypeScript types for KaTeX render API |

---

## Backend (`backend/requirements.txt`)

| Package | Version | Purpose | Why this package |
|---------|---------|---------|-----------------|
| `fastapi` | 0.115.0 | Web framework | Async ASGI framework with automatic OpenAPI/Swagger docs. Single `/compute` endpoint dispatches by op name |
| `uvicorn[standard]` | 0.30.6 | ASGI server | Runs FastAPI. `[standard]` includes websocket + HTTP/2 support via `httptools`/`uvloop` |
| `sympy` | 1.13.3 | Symbolic math | All CAS operations: derivatives, integrals, limits, solve, factor, expand, simplify, Taylor series. `parse_expr` with `convert_xor` handles frontend `^` syntax |
| `numpy` | 2.1.1 | Numerical arrays | Vectorised evaluation in `stats.sample`, `regression`. SymPy lambdify targets numpy for fast float evaluation |
| `scipy` | 1.14.1 | Scientific computing | Available for future ops (ODE solvers, special functions). Currently installed for readiness; not directly called in Phase 2 ops |
| `pydantic` | 2.9.2 | Data validation | Request/response models for `/compute`. Validates `op` and `inputs` types at the API boundary |

---

## Vulnerability status

### Current audit (2026-06-08)

Run audit:
```bash
# Frontend
cd frontend && npm audit

# Backend
pip install pip-audit && pip-audit -r backend/requirements.txt
```

### Known open issues

| Package | Severity | Advisory | Scope | Status |
|---------|----------|----------|-------|--------|
| `esbuild ≤0.24.2` | Moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server accepts cross-origin requests, attacker on same machine can read dev server responses | **devDep only** — no production impact | Open. Fix requires vite v8 (breaking). Accept risk for dev-only use; do not expose port 5173 publicly |
| `vite ≤6.4.1` | Moderate | Same chain as esbuild above | **devDep only** | Open — same as above |
| `@vitejs/plugin-react 2.0.0-alpha.0 – 4.3.3` | Moderate | Same chain | **devDep only** | Open — same as above |
| `vite-node ≤2.2.0-beta.2` | Moderate | Same chain | **devDep only** | Open — same as above |
| `@vitest/mocker ≤3.0.0-beta.4` | Moderate | Same chain | **devDep only** | Open — same as above |
| `vitest ≤3.2.5` | **Critical** | Same esbuild chain — vitest dev server inherits vulnerability | **devDep only** — test runner, never runs in production | Open — same as above |

> All 6 open vulnerabilities trace to a single root: `esbuild ≤0.24.2` bundled in `vite 5.x`. The fix (`vite@8.x`) is a major breaking change requiring migration of `vite.config.ts`, plugin API calls, and possibly `import.meta.glob` usage. Accepted as dev-only risk. Revisit when vite 6/7/8 migration is planned.

### Resolved

| Package | Was | Fixed to | Advisory |
|---------|-----|----------|----------|
| `katex` | 0.16.11 | 0.16.47 | [GHSA-cg87-wmx4-v546](https://github.com/advisories/GHSA-cg87-wmx4-v546) — `\htmlData` attribute injection (production dep, fixed) |
| `@eslint/plugin-kit` | ≤0.3.3 | resolved via eslint 9.39.4 | [GHSA-7q7g-4xm8-89cq](https://github.com/advisories/GHSA-7q7g-4xm8-89cq) — ReDoS in lint config parser |

---

## Dependency selection criteria

**Frontend decisions:**

- **No Redux** — Zustand provides the same global state with 1/10th the boilerplate. Expression list mutations fit the slice pattern cleanly.
- **No Axios** — native `fetch` wrapped in `frontend/src/api/client.ts` is sufficient for a single POST endpoint.
- **No styling library** (Tailwind, MUI, etc.) — inline styles used throughout for zero-runtime CSS-in-JS overhead in the WebGL-heavy render loop.
- **No router** — single-page, no URL routing needed.
- **Vitest over Jest** — same Vite config, no separate transpile step, faster cold start.

**Backend decisions:**

- **FastAPI over Flask/Django** — async ASGI, automatic Pydantic validation, OpenAPI docs free. Single endpoint dispatch pattern fits the op registry.
- **SymPy over Mathematica/Wolfram** — open source, Python-native, integrates directly with numpy lambdify.
- **No database** — stateless compute server; all state lives in the frontend. Simplifies deployment.
- **scipy included but not yet called** — installed to avoid a container rebuild when ODE/stats ops land in Phase 3.
