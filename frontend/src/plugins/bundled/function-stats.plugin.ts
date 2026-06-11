import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.function-stats",
  version: "1.0.0",
  name: "Function Statistics",
  author: "NexusGraph",
  description: "Descriptive statistics of f(x) sampled on [a, b]: mean, std dev, min, max, RMS",
  tags: ["statistics", "data"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "function_stats",
      label: "Statistics",
      description: "Sampled statistics of f on [a, b]",
      category: "analysis",
      appliesTo: ["function"],
      inputs: [
        { name: "a", type: "number", label: "a", default: -5 },
        { name: "b", type: "number", label: "b", default: 5 },
        { name: "n", type: "number", label: "samples", default: 500 },
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
  var n = Math.max(2, Math.round(Number(inputs.n)));
  if (!(b > a)) return { ok: false, error: 'Require b > a', data: {} };
  var xs = utils.linspace(a, b, n);
  var ys = [];
  for (var k = 0; k < xs.length; k++) {
    var v = f(xs[k]);
    if (isFinite(v)) ys.push(v);
  }
  if (ys.length < 2) return { ok: false, error: 'Too few finite samples on [a, b]', data: {} };
  var mean = utils.mean(ys);
  var sq = 0, mn = ys[0], mx = ys[0], rms = 0;
  for (var j = 0; j < ys.length; j++) {
    var d = ys[j] - mean;
    sq += d * d;
    rms += ys[j] * ys[j];
    if (ys[j] < mn) mn = ys[j];
    if (ys[j] > mx) mx = ys[j];
  }
  var variance = sq / (ys.length - 1);
  return {
    ok: true,
    data: {
      mean: mean,
      std: Math.sqrt(variance),
      variance: variance,
      min: mn,
      max: mx,
      rms: Math.sqrt(rms / ys.length),
      samples: ys.length
    }
  };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "mean", value: "result.mean", precision: 7 },
          { type: "value", label: "std dev", value: "result.std", precision: 7 },
          { type: "value", label: "min", value: "result.min", precision: 7 },
          { type: "value", label: "max", value: "result.max", precision: 7 },
          { type: "value", label: "RMS", value: "result.rms", precision: 7 },
          { type: "value", label: "samples used", value: "result.samples" },
        ],
      },
      docs: "Samples f at n evenly spaced points on [a, b] (non-finite values dropped) and reports mean, sample standard deviation, variance, min, max, and RMS.",
    },
  ],
};
