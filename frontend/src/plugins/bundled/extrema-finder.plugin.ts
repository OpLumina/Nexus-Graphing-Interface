import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.extrema",
  version: "1.0.0",
  name: "Extrema Finder",
  author: "NexusGraph",
  description: "Locate local minima and maxima of f(x) in the visible viewport",
  tags: ["analysis", "numeric"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "extrema_finder",
      label: "Extrema",
      description: "Local min/max in the current view",
      category: "analysis",
      appliesTo: ["function"],
      inputs: [],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var f = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  var h = 1e-6;
  var d = function (x) { return (f(x + h) - f(x - h)) / (2 * h); };
  var xMin = ctx.viewport.xMin, xMax = ctx.viewport.xMax;
  var N = 1200;
  var step = (xMax - xMin) / N;
  var minima = [], maxima = [];
  var prevX = xMin, prevD = d(xMin);
  for (var k = 1; k <= N; k++) {
    var x = xMin + k * step;
    var dv = d(x);
    if (isFinite(prevD) && isFinite(dv) && prevD * dv < 0) {
      var lo = prevX, hi = x, dlo = prevD;
      for (var j = 0; j < 50; j++) {
        var mid = (lo + hi) / 2;
        var dm = d(mid);
        if (dlo * dm <= 0) { hi = mid; } else { lo = mid; dlo = dm; }
      }
      var xc = (lo + hi) / 2;
      var yc = f(xc);
      if (isFinite(yc)) {
        var entry = { x: Number(xc.toPrecision(8)), y: Number(yc.toPrecision(8)) };
        if (prevD > 0) maxima.push(entry); else minima.push(entry);
      }
    }
    prevX = x; prevD = dv;
  }
  var fmt = function (list) {
    if (list.length === 0) return 'none in view';
    var parts = [];
    for (var m = 0; m < list.length; m++) parts.push('(' + list[m].x + ', ' + list[m].y + ')');
    return parts.join('   ');
  };
  return { ok: true, data: { minima: fmt(minima), maxima: fmt(maxima), count: minima.length + maxima.length } };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "maxima", value: "result.maxima" },
          { type: "value", label: "minima", value: "result.minima" },
          { type: "value", label: "total", value: "result.count" },
        ],
      },
      docs: "Scans the visible x-range for sign changes of f′(x) (1200 samples), then refines each by bisection. Pan/zoom changes the search window; re-run after moving the view.",
    },
  ],
};
