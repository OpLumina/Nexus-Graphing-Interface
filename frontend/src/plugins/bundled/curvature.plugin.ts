import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.curvature",
  version: "1.0.0",
  name: "Curvature",
  author: "NexusGraph",
  description: "Curvature κ, radius, and osculating circle center of y = f(x) at a point",
  tags: ["calculus", "geometry"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "curvature_at_point",
      label: "Curvature",
      description: "κ = |f″| / (1 + f′²)^(3/2) at x₀",
      category: "geometry",
      appliesTo: ["function"],
      inputs: [{ name: "x0", type: "number", label: "x₀", default: 0 }],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var f = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  var x0 = Number(inputs.x0);
  var y0 = f(x0);
  if (!isFinite(y0)) return { ok: false, error: 'f(x0) is undefined', data: {} };
  var h = 1e-4;
  var d1 = (f(x0 + h) - f(x0 - h)) / (2 * h);
  var d2 = (f(x0 + h) - 2 * y0 + f(x0 - h)) / (h * h);
  if (!isFinite(d1) || !isFinite(d2)) return { ok: false, error: 'Derivatives undefined at x0', data: {} };
  var denom = Math.pow(1 + d1 * d1, 1.5);
  var kappa = Math.abs(d2) / denom;
  var data = { kappa: kappa, fprime: d1, fsecond: d2 };
  if (kappa > 1e-12) {
    var R = 1 / kappa;
    var s = d2 > 0 ? 1 : -1;
    data.radius = R;
    data.center_x = x0 - s * d1 * (1 + d1 * d1) / Math.abs(d2);
    data.center_y = y0 + s * (1 + d1 * d1) / Math.abs(d2);
  } else {
    data.radius = Infinity;
  }
  return { ok: true, data: data };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "κ", value: "result.kappa", precision: 8 },
          { type: "value", label: "radius", value: "result.radius", precision: 8 },
          { type: "value", label: "center x", value: "result.center_x", precision: 6 },
          { type: "value", label: "center y", value: "result.center_y", precision: 6 },
          { type: "value", label: "f′(x₀)", value: "result.fprime", precision: 6 },
          { type: "value", label: "f″(x₀)", value: "result.fsecond", precision: 6 },
        ],
      },
      docs: "Curvature κ = |f″(x)| / (1 + f′(x)²)^{3/2} from finite differences, plus the radius and center of the osculating circle.",
    },
  ],
};
