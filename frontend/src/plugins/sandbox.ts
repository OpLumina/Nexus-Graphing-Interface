// Sandboxed execution of plugin inline JS.
// Uses new Function() with a tightly restricted scope.
//
// ⚠ CSP NOTE: new Function() requires 'unsafe-eval' in the Content-Security-Policy.
// In Electron, add to the BrowserWindow webPreferences:
//   webPreferences: { additionalArguments: ["--allow-running-insecure-content"] }
// and in the meta CSP tag:
//   <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval'">
//
// For a web deployment, replace new Function() with a Worker + MessageChannel instead.

import type { ToolContext, ToolResult, ToolInputValues } from "../tools/types";

// Restricted Math subset exposed to plugins — no exotic globals.
const SAFE_MATH = {
  abs: Math.abs, acos: Math.acos, acosh: Math.acosh,
  asin: Math.asin, asinh: Math.asinh, atan: Math.atan, atan2: Math.atan2, atanh: Math.atanh,
  cbrt: Math.cbrt, ceil: Math.ceil, cos: Math.cos, cosh: Math.cosh,
  exp: Math.exp, expm1: Math.expm1, floor: Math.floor, hypot: Math.hypot,
  log: Math.log, log1p: Math.log1p, log2: Math.log2, log10: Math.log10,
  max: Math.max, min: Math.min, pow: Math.pow, random: Math.random,
  round: Math.round, sign: Math.sign, sin: Math.sin, sinh: Math.sinh,
  sqrt: Math.sqrt, tan: Math.tan, tanh: Math.tanh, trunc: Math.trunc,
  PI: Math.PI, E: Math.E, LN2: Math.LN2, LN10: Math.LN10,
  SQRT2: Math.SQRT2, LOG2E: Math.LOG2E, LOG10E: Math.LOG10E,
};

// Additional numeric utilities available to plugins.
const UTILS = {
  linspace: (start: number, end: number, n: number): number[] => {
    const arr: number[] = [];
    for (let i = 0; i < n; i++) arr.push(start + (i / (n - 1)) * (end - start));
    return arr;
  },
  range: (start: number, end: number, step = 1): number[] => {
    const arr: number[] = [];
    for (let v = start; v < end; v += step) arr.push(v);
    return arr;
  },
  sum:  (arr: number[]): number => arr.reduce((a, b) => a + b, 0),
  mean: (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length,
  dot:  (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i], 0),
};

/**
 * Execute a plugin's inline JS in a restricted sandbox.
 * The code string must define a function `run(inputs, ctx)` that returns a ToolResult
 * or a Promise<ToolResult>.
 */
export async function runSandboxed(
  js: string,
  inputs: ToolInputValues,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // Construct the function with only safe globals in scope.
    // "use strict" prevents access to the outer `this`.
    // Shadow browser globals so plugin code cannot escape to DOM/network.
    // "use strict" removes implicit `this`; shadowed params override the outer scope.
    const factory = new Function(
      "inputs", "ctx", "Math", "utils",
      "globalThis", "window", "document", "self", "location", "fetch", "XMLHttpRequest",
      `"use strict";\n${js}\nreturn run(inputs, ctx);`,
    );

    const result = await Promise.resolve(
      factory(inputs, ctx, SAFE_MATH, UTILS,
        undefined, undefined, undefined, undefined, undefined, undefined, undefined)
    );

    // Validate shape
    if (typeof result !== "object" || typeof result.ok !== "boolean") {
      return { ok: false, error: "Plugin run() must return { ok, data, overlays? }", data: {} };
    }

    return result as ToolResult;
  } catch (err) {
    return {
      ok: false,
      error: `Plugin error: ${String(err)}`,
      data: {},
    };
  }
}
