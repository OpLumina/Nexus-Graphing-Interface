import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.inverse-solver",
  version: "1.0.0",
  name: "Inverse Solver",
  author: "NexusGraph",
  description: "Solve f(x) = c for x — every solution visible in the viewport",
  tags: ["algebra", "numeric"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "inverse_solve",
      label: "Solve f(x) = c",
      description: "Find all x in view with f(x) = c",
      category: "algebra",
      appliesTo: ["function"],
      inputs: [{ name: "c", type: "number", label: "c", default: 0 }],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var c = Number(inputs.c);
  var g = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v - c : NaN; } catch (e) { return NaN; } };
  var xMin = ctx.viewport.xMin, xMax = ctx.viewport.xMax;
  var N = 1500;
  var step = (xMax - xMin) / N;
  var roots = [];
  var prevX = xMin, prevV = g(xMin);
  for (var k = 1; k <= N; k++) {
    var x = xMin + k * step;
    var v = g(x);
    if (isFinite(prevV) && isFinite(v) && (prevV === 0 || prevV * v < 0)) {
      var lo = prevX, hi = x, vlo = prevV;
      for (var j = 0; j < 60; j++) {
        var mid = (lo + hi) / 2;
        var vm = g(mid);
        if (vlo * vm <= 0) { hi = mid; } else { lo = mid; vlo = vm; }
      }
      var root = (lo + hi) / 2;
      if (roots.length === 0 || Math.abs(root - roots[roots.length - 1]) > step / 2) roots.push(Number(root.toPrecision(9)));
    }
    prevX = x; prevV = v;
  }
  var text = roots.length === 0 ? 'no solutions in view' : roots.join(',  ');
  return {
    ok: true,
    data: { solutions: text, count: roots.length },
    overlays: [{ x0: xMin, y0: c, slope: 0, color: '#ffc935', label: 'y = c', style: 'dashed' }]
  };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "x solutions", value: "result.solutions" },
          { type: "value", label: "count", value: "result.count" },
        ],
      },
      docs: "Scans the visible x-range for sign changes of f(x) − c and refines each crossing by bisection. The dashed line shows y = c. Tangencies (no sign change) are not detected.",
    },
  ],
};
