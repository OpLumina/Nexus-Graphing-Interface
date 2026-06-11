import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.root-finder",
  version: "1.0.0",
  name: "Root Finder (Newton)",
  author: "NexusGraph",
  description: "Find a root of f(x) = 0 with Newton's method from an initial guess",
  tags: ["analysis", "numeric"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "newton_root",
      label: "Newton Root",
      description: "Newton's method root near x₀",
      category: "analysis",
      appliesTo: ["function"],
      inputs: [{ name: "x0", type: "number", label: "guess x₀", default: 1 }],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var f = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  var x = Number(inputs.x0);
  var h = 1e-7;
  var iterations = 0;
  for (var k = 0; k < 60; k++) {
    var fx = f(x);
    if (!isFinite(fx)) return { ok: false, error: 'f undefined at x = ' + x.toPrecision(6), data: {} };
    if (Math.abs(fx) < 1e-12) break;
    var d = (f(x + h) - f(x - h)) / (2 * h);
    if (!isFinite(d) || Math.abs(d) < 1e-14) return { ok: false, error: 'Derivative vanished — try a different guess', data: {} };
    var next = x - fx / d;
    iterations = k + 1;
    if (!isFinite(next) || Math.abs(next) > 1e12) return { ok: false, error: 'Diverged — try a different guess', data: {} };
    if (Math.abs(next - x) < 1e-13) { x = next; break; }
    x = next;
  }
  var residual = f(x);
  if (Math.abs(residual) > 1e-6) return { ok: false, error: 'Did not converge (|f| = ' + Math.abs(residual).toExponential(2) + ')', data: {} };
  return { ok: true, data: { root: x, residual: residual, iterations: iterations } };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "root", value: "result.root", precision: 10 },
          { type: "value", label: "f(root)", value: "result.residual", precision: 3 },
          { type: "value", label: "iterations", value: "result.iterations" },
        ],
      },
      docs: "Newton–Raphson iteration x ← x − f(x)/f′(x) with a numeric derivative. Converges quadratically near simple roots; pick a guess close to the root you want.",
    },
  ],
};
