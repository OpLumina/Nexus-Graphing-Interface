import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.euler-ode",
  version: "1.0.0",
  name: "Euler's Method",
  author: "NexusGraph",
  description: "Tabulate y′ = f(x) solutions with Euler's method from (x₀, y₀)",
  tags: ["differential equations", "numeric"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "euler_method",
      label: "Euler's Method",
      description: "Step y ← y + h·f(x) from an initial condition",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [
        { name: "x0", type: "number", label: "x₀", default: 0 },
        { name: "y0", type: "number", label: "y₀", default: 0 },
        { name: "h", type: "number", label: "step h", default: 0.1 },
        { name: "steps", type: "number", label: "steps", default: 10 },
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
  var x = Number(inputs.x0), y = Number(inputs.y0);
  var h = Number(inputs.h);
  var steps = Math.max(1, Math.min(200, Math.round(Number(inputs.steps))));
  if (!isFinite(h) || h === 0) return { ok: false, error: 'Step h must be nonzero', data: {} };
  var rows = [{ x: Number(x.toPrecision(6)), y: Number(y.toPrecision(6)) }];
  for (var k = 0; k < steps; k++) {
    var slope = f(x);
    if (!isFinite(slope)) return { ok: false, error: 'f undefined at x = ' + x.toPrecision(6), data: { rows: rows } };
    y = y + h * slope;
    x = x + h;
    rows.push({ x: Number(x.toPrecision(6)), y: Number(y.toPrecision(6)) });
  }
  return { ok: true, data: { rows: rows, final_x: x, final_y: y } };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "final y", value: "result.final_y", precision: 8 },
          { type: "table" },
        ],
      },
      docs: "Treats the selected function as the slope field y′ = f(x) and integrates forward with Euler steps y ← y + h·f(x). Use a negative h to step backward. Capped at 200 steps.",
    },
  ],
};
