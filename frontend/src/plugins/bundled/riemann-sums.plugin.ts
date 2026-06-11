import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.riemann",
  version: "1.0.0",
  name: "Riemann Sums",
  author: "NexusGraph",
  description: "Left, right, midpoint, and trapezoid sums for ∫f(x)dx on [a, b]",
  tags: ["calculus", "integration"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "riemann_sums",
      label: "Riemann Sums",
      description: "Compare Riemann sum approximations of the integral",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [
        { name: "a", type: "number", label: "a", default: 0 },
        { name: "b", type: "number", label: "b", default: 1 },
        { name: "n", type: "number", label: "n", default: 20 },
      ],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var f = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  var a = Number(inputs.a), b = Number(inputs.b);
  var n = Math.max(1, Math.round(Number(inputs.n)));
  if (!(b > a)) return { ok: false, error: 'Require b > a', data: {} };
  var dx = (b - a) / n;
  var left = 0, right = 0, mid = 0;
  for (var k = 0; k < n; k++) {
    var x = a + k * dx;
    var fl = f(x), fr = f(x + dx), fm = f(x + dx / 2);
    if (isFinite(fl)) left  += fl * dx;
    if (isFinite(fr)) right += fr * dx;
    if (isFinite(fm)) mid   += fm * dx;
  }
  var trap = (left + right) / 2;
  return { ok: true, data: { left: left, right: right, midpoint: mid, trapezoid: trap, n: n, dx: dx } };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "left sum", value: "result.left", precision: 8 },
          { type: "value", label: "right sum", value: "result.right", precision: 8 },
          { type: "value", label: "midpoint", value: "result.midpoint", precision: 8 },
          { type: "value", label: "trapezoid", value: "result.trapezoid", precision: 8 },
          { type: "value", label: "Δx", value: "result.dx", precision: 5 },
        ],
      },
      docs: "Partitions [a, b] into n equal subintervals and computes the left, right, midpoint, and trapezoid approximations of the definite integral. Non-finite samples are skipped.",
    },
  ],
};
