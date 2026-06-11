import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.average-value",
  version: "1.0.0",
  name: "Average Value",
  author: "NexusGraph",
  description: "Mean value of f(x) on [a, b] with a horizontal overlay line",
  tags: ["calculus", "integration"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "average_value",
      label: "Average Value",
      description: "(1/(b−a)) ∫ f(x) dx with overlay",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [
        { name: "a", type: "number", label: "a", default: 0 },
        { name: "b", type: "number", label: "b", default: 1 },
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
  if (!(b > a)) return { ok: false, error: 'Require b > a', data: {} };
  var n = 1000;
  var dx = (b - a) / n;
  var s = 0, fa = f(a), fb = f(b);
  if (!isFinite(fa) || !isFinite(fb)) return { ok: false, error: 'f undefined at an endpoint', data: {} };
  s = fa + fb;
  for (var k = 1; k < n; k++) {
    var v = f(a + k * dx);
    if (!isFinite(v)) return { ok: false, error: 'f undefined inside [a, b]', data: {} };
    s += (k % 2 === 1 ? 4 : 2) * v;
  }
  var integral = (dx / 3) * s;
  var avg = integral / (b - a);
  return {
    ok: true,
    data: { average: avg, integral: integral },
    overlays: [{ x0: a, y0: avg, slope: 0, color: '#6be08e', label: 'average', style: 'dashed' }]
  };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "average", value: "result.average", precision: 8 },
          { type: "value", label: "∫f dx", value: "result.integral", precision: 8 },
        ],
      },
      docs: "Computes the mean value theorem average (1/(b−a))∫f(x)dx via Simpson's rule and draws it as a dashed horizontal line.",
    },
  ],
};
