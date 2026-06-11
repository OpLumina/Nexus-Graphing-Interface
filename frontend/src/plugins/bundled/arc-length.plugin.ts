import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.arc-length",
  version: "1.0.0",
  name: "Arc Length",
  author: "NexusGraph",
  description: "Numeric arc length of the curve y = f(x) over [a, b]",
  tags: ["calculus", "geometry"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "arc_length",
      label: "Arc Length",
      description: "∫ √(1 + f′(x)²) dx on [a, b]",
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
  var h = 1e-5;
  var g = function (x) {
    var d = (f(x + h) - f(x - h)) / (2 * h);
    return Math.sqrt(1 + d * d);
  };
  // Simpson's rule, n even
  var n = 1000;
  var dx = (b - a) / n;
  var s = g(a) + g(b);
  var bad = !isFinite(s);
  for (var k = 1; k < n; k++) {
    var v = g(a + k * dx);
    if (!isFinite(v)) { bad = true; continue; }
    s += (k % 2 === 1 ? 4 : 2) * v;
  }
  if (bad) return { ok: false, error: 'f or f′ undefined somewhere on [a, b]', data: {} };
  var length = (dx / 3) * s;
  var chord = Math.sqrt((b - a) * (b - a) + (f(b) - f(a)) * (f(b) - f(a)));
  return { ok: true, data: { length: length, chord: chord, ratio: length / chord } };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "arc length", value: "result.length", precision: 8 },
          { type: "value", label: "chord", value: "result.chord", precision: 6 },
          { type: "value", label: "length/chord", value: "result.ratio", precision: 5 },
        ],
      },
      docs: "Integrates √(1 + f′(x)²) with Simpson's rule (1000 panels) using a central-difference derivative. Also reports the straight chord length for comparison.",
    },
  ],
};
