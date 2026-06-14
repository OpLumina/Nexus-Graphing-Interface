/// <reference lib="webworker" />
//
// Plugin sandbox Worker (SEC-1). Plugin inline JS runs HERE, in a dedicated
// Worker realm — never in the main window realm. This Worker's global scope has
// no DOM, no `window`, and crucially no `electronAPI` file bridge (preload.ts),
// so even the unblockable constructor-chain escape
// (`({}).constructor.constructor("return globalThis")()`) can at most reach this
// Worker's own globals: it cannot read/write local files or touch the UI.
//
// `ctx.userFns` are JS closures and cannot be structured-cloned across
// postMessage, so the main thread forwards only the serializable context
// (env, viewport, expressions-as-plain-AST, exprId) and we rebuild an identical
// userFns map from the pure engine (engine/userfns.ts). That keeps the
// synchronous `fn([x])` call API plugins rely on inside tight integration loops.

import { buildUserFns } from "../engine/userfns";
import type { Env } from "../engine/evaluator";
import type { Viewport } from "../renderer/viewport";
import type { ToolInputValues, ToolResult, ExpressionLike } from "../tools/types";

interface WorkerCtx {
  env: Env;
  viewport: Viewport;
  expressions: ExpressionLike[];
  exprId?: string;
}

interface RunMessage {
  reqId: number;
  js: string;
  inputs: ToolInputValues;
  ctx: WorkerCtx;
}

// Numeric helpers exposed to plugins as `utils` (mirrors the documented sandbox
// API). `Math` is the realm's native Math — harmless and used directly by
// plugins as `Math.cos`, etc.
const UTILS = {
  linspace: (start: number, end: number, n: number): number[] => {
    if (n <= 1) return n === 1 ? [start] : [];
    const arr: number[] = [];
    for (let i = 0; i < n; i++) arr.push(start + (i / (n - 1)) * (end - start));
    return arr;
  },
  range: (start: number, end: number, step = 1): number[] => {
    if (step <= 0) return [];
    const arr: number[] = [];
    for (let v = start; v < end; v += step) arr.push(v);
    return arr;
  },
  sum:  (arr: number[]): number => arr.reduce((a, b) => a + b, 0),
  mean: (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length,
  dot:  (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i], 0),
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// SEC-7: do NOT rely on the document meta-tag CSP `connect-src` to bound this
// Worker's egress — module workers frequently take CSP from their own response
// headers, not the parent meta tag, so meta-only enforcement may leave
// fetch/WebSocket exfil open. Hard-remove the network primitives from the Worker
// realm itself: even a constructor-chain escape that recovers `globalThis` then
// finds no fetch/XHR/WebSocket/importScripts to call. This realm has no need for
// network access (buildUserFns is pure). `Function`/`new Function` is left
// intact because it is required to run the plugin body.
const NET_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "importScripts", "Request", "Response"] as const;
for (const name of NET_GLOBALS) {
  try {
    Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
  } catch {
    // Non-configurable accessor on the prototype — fall back to a best-effort
    // assignment so at least the common `fetch(...)` / `new WebSocket(...)` paths
    // resolve to undefined.
    try { (self as unknown as Record<string, unknown>)[name] = undefined; } catch { /* read-only: nothing more we can do */ }
  }
}

function isToolResult(r: unknown): r is ToolResult {
  return typeof r === "object" && r !== null && typeof (r as ToolResult).ok === "boolean";
}

// The pooled worker (ARCH-6) serves many runs over its lifetime, so every reply
// carries the originating reqId and the main thread routes by it.
function post(reqId: number, result: ToolResult): void {
  try {
    ctx.postMessage({ ...result, __reqId: reqId });
  } catch (err) {
    // A plugin returned something not structured-cloneable (e.g. a function).
    ctx.postMessage({ ok: false, error: `Plugin returned non-serializable data: ${String(err)}`, data: {}, __reqId: reqId });
  }
}

ctx.onmessage = (e: MessageEvent<RunMessage>) => {
  const { reqId, js, inputs, ctx: workerCtx } = e.data;
  try {
    const userFns = buildUserFns(workerCtx.expressions, workerCtx.env);
    const fullCtx = { ...workerCtx, userFns };

    // Defense in depth: shadow the network + code-eval globals even though this
    // realm already lacks the dangerous (DOM / electronAPI) surface. CSP
    // connect-src (index.html) is the real exfiltration control; this just
    // blocks casual `fetch(...)` by name.
    const shadowed = [
      "fetch", "XMLHttpRequest", "WebSocket", "importScripts",
      "Function", "globalThis", "self",
    ];
    const factory = new Function(
      "inputs", "ctx", "utils", ...shadowed,
      `"use strict";\n${js}\nreturn run(inputs, ctx);`,
    );

    Promise.resolve(
      factory(inputs, fullCtx, UTILS, ...shadowed.map(() => undefined)),
    )
      .then((result) => {
        if (!isToolResult(result)) {
          post(reqId, { ok: false, error: "Plugin run() must return { ok, data, overlays? }", data: {} });
        } else {
          post(reqId, result);
        }
      })
      .catch((err) => post(reqId, { ok: false, error: `Plugin error: ${String(err)}`, data: {} }));
  } catch (err) {
    post(reqId, { ok: false, error: `Plugin error: ${String(err)}`, data: {} });
  }
};
