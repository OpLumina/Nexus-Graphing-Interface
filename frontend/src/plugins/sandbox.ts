// Sandboxed execution of plugin inline JS in a dedicated Worker realm (SEC-1).
//
// Plugin code runs in a Worker (sandbox.worker.ts), NOT the main window realm.
// The Worker global scope has no DOM, no `window`, and crucially no
// `electronAPI` file bridge (preload.ts), so the constructor-chain escape
// (`({}).constructor.constructor`) can at most reach the Worker's own globals —
// it cannot read/write local files or touch the UI. Network globals (fetch/WS)
// exist in the Worker but CSP `connect-src` (index.html) blocks exfiltration to
// non-backend hosts. The Worker is also terminated after RUN_TIMEOUT_MS, so a
// runaway / infinite-loop plugin cannot hang the app.
//
// `ctx.userFns` are JS closures and cannot be structured-cloned across
// postMessage, so we forward only the serializable parts of the context
// (env, viewport, expressions-as-plain-AST, exprId); the Worker rebuilds an
// identical userFns map from the pure engine (engine/userfns.ts), preserving the
// synchronous `fn([x])` call API plugins use inside tight loops.

import type { ToolContext, ToolResult, ToolInputValues } from "../tools/types";

// Wall-clock budget for a single plugin run. Past this the Worker is terminated.
const RUN_TIMEOUT_MS = 5000;

// ARCH-6: pool ONE long-lived Worker instead of spinning a fresh module worker
// up (+ re-bundling sandbox.worker.ts) on every runSandboxed call — that cost
// dominates for tools run interactively or in tight loops. The worker is reused
// across runs and only recreated after a timeout/error kill. Concurrent runs are
// correlated by a monotonic reqId so replies route back to the right caller.
type Pending = (result: ToolResult) => void;

let pooledWorker: Worker | null = null;
let pending = new Map<number, Pending>();
let nextReqId = 1;

function makeWorker(): Worker {
  const w = new Worker(new URL("./sandbox.worker.ts", import.meta.url), { type: "module" });

  w.onmessage = (e: MessageEvent<ToolResult & { __reqId?: number }>) => {
    const r = e.data;
    const reqId = r?.__reqId;
    if (typeof reqId !== "number") return;
    const resolve = pending.get(reqId);
    if (!resolve) return;
    pending.delete(reqId);
    if (typeof r !== "object" || r === null || typeof r.ok !== "boolean") {
      resolve({ ok: false, error: "Plugin run() must return { ok, data, overlays? }", data: {} });
    } else {
      resolve(r);
    }
  };

  // A worker-level error tears down the shared realm, so fail every in-flight
  // run and force a fresh worker on the next call.
  w.onerror = (e) => killWorker({ ok: false, error: `Plugin error: ${e.message || "worker error"}`, data: {} });

  return w;
}

function getWorker(): Worker {
  if (!pooledWorker) pooledWorker = makeWorker();
  return pooledWorker;
}

// Terminate the pooled worker and reject all in-flight runs with `result`. Used
// on timeout (runaway plugin) or worker error — the realm is shared, so one
// fatal run takes the worker down and the next call lazily rebuilds it.
function killWorker(result: ToolResult): void {
  pooledWorker?.terminate();
  pooledWorker = null;
  const inflight = pending;
  pending = new Map();
  for (const resolve of inflight.values()) resolve(result);
}

/**
 * Execute a plugin's inline JS in a Worker sandbox.
 * The code string must define a function `run(inputs, ctx)` that returns a
 * ToolResult or a Promise<ToolResult>.
 */
export async function runSandboxed(
  js: string,
  inputs: ToolInputValues,
  ctx: ToolContext,
): Promise<ToolResult> {
  if (typeof Worker === "undefined") {
    return { ok: false, error: "Plugin sandbox unavailable (no Worker support)", data: {} };
  }

  const reqId = nextReqId++;

  // Only the structured-cloneable parts of the context cross the boundary;
  // userFns (closures) are rebuilt inside the Worker.
  const payload = {
    reqId,
    js,
    inputs,
    ctx: {
      env:         ctx.env,
      viewport:    ctx.viewport,
      expressions: ctx.expressions,
      exprId:      ctx.exprId,
    },
  };

  return new Promise<ToolResult>((resolve) => {
    let done = false;
    const finish = (result: ToolResult): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      pending.delete(reqId);
      resolve(result);
    };

    // On timeout, kill the shared worker (the only way to stop a runaway plugin);
    // killWorker rejects any other in-flight runs too, so guard `done` first.
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      pending.delete(reqId);
      killWorker({ ok: false, error: `Plugin timed out after ${RUN_TIMEOUT_MS} ms`, data: {} });
      resolve({ ok: false, error: `Plugin timed out after ${RUN_TIMEOUT_MS} ms`, data: {} });
    }, RUN_TIMEOUT_MS);

    pending.set(reqId, finish);

    try {
      getWorker().postMessage(payload);
    } catch (err) {
      finish({ ok: false, error: `Plugin context not serializable: ${String(err)}`, data: {} });
    }
  });
}
