import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.custom-table",
  version: "1.0.0",
  name: "Custom Value Table",
  author: "NexusGraph",
  description: "Tabulate f(x) over any range with any step size",
  tags: ["utility", "data"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "custom_value_table",
      label: "Custom Table",
      description: "f(x) at evenly spaced x from start to end",
      category: "utility",
      appliesTo: ["function"],
      inputs: [
        { name: "start", type: "number", label: "start", default: -2 },
        { name: "end", type: "number", label: "end", default: 2 },
        { name: "step", type: "number", label: "step", default: 0.5 },
      ],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var start = Number(inputs.start), end = Number(inputs.end), step = Number(inputs.step);
  if (!(step > 0)) return { ok: false, error: 'Step must be positive', data: {} };
  if (!(end >= start)) return { ok: false, error: 'Require end ≥ start', data: {} };
  if ((end - start) / step > 500) return { ok: false, error: 'Too many rows (max 500) — increase step', data: {} };
  var rows = [];
  for (var x = start; x <= end + 1e-12; x += step) {
    var xr = Number(x.toPrecision(10));
    var v;
    try { v = fn([xr]); } catch (e) { v = NaN; }
    rows.push({ x: xr, y: typeof v === 'number' ? v : NaN });
  }
  return { ok: true, data: { rows: rows, count: rows.length } };
}`,
      },
      outputs: {
        panel: [
          { type: "table" },
          { type: "value", label: "rows", value: "result.count" },
        ],
      },
      docs: "Like the built-in value table, but with configurable start, end, and step. Capped at 500 rows.",
    },
  ],
};
