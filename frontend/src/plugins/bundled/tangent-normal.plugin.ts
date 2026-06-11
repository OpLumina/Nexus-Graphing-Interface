import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.tangent-normal",
  version: "1.0.0",
  name: "Tangent & Normal Lines",
  author: "NexusGraph",
  description: "Draw the tangent and normal line to f(x) at a point, with slope readouts",
  tags: ["calculus", "geometry"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "tangent_normal",
      label: "Tangent & Normal",
      description: "Tangent and normal lines at x = x₀",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [{ name: "x0", type: "number", label: "x₀", default: 1 }],
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
  var h = 1e-5;
  var m = (f(x0 + h) - f(x0 - h)) / (2 * h);
  if (!isFinite(m)) return { ok: false, error: 'Derivative undefined at x0', data: {} };
  var overlays = [{ x0: x0, y0: y0, slope: m, color: '#61acff', label: 'tangent' }];
  if (Math.abs(m) > 1e-12) overlays.push({ x0: x0, y0: y0, slope: -1 / m, color: '#ffa94d', label: 'normal', style: 'dashed' });
  return { ok: true, data: { slope: m, y0: y0, normal_slope: Math.abs(m) > 1e-12 ? -1 / m : Infinity }, overlays: overlays };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "f(x₀)", value: "result.y0", precision: 6 },
          { type: "value", label: "tangent slope", value: "result.slope", precision: 6 },
          { type: "value", label: "normal slope", value: "result.normal_slope", precision: 6 },
        ],
      },
      docs: "Computes f′(x₀) by central difference and overlays the tangent line (solid blue) and normal line (dashed orange).",
    },
  ],
};
