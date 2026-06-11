import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.fourier",
  version: "1.1.0",
  name: "Fourier Series",
  author: "NexusGraph",
  description: "Compute Fourier series coefficients and approximate a function with a partial sum",
  tags: ["calculus", "series", "signal processing"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "fourier_coefficients",
      label: "Fourier Series",
      description: "Compute aₙ and bₙ coefficients for a Fourier series expansion",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [
        { name: "n", type: "number", label: "terms", default: 5 },
        { name: "L", type: "number", label: "period/2", default: 3.14159 },
      ],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var n = Math.max(1, Math.round(inputs.n != null ? inputs.n : 5));
  var L = inputs.L != null ? Number(inputs.L) : Math.PI;
  var N = 500;
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  function evalAt(x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } }
  function integrate(g, a, b, steps) {
    var h = (b - a) / steps;
    var s = 0;
    for (var i = 0; i <= steps; i++) {
      var x = a + i * h;
      var w = (i === 0 || i === steps) ? 0.5 : 1;
      var v = g(x);
      if (isFinite(v)) s += w * v * h;
    }
    return s;
  }
  var a0 = (1 / L) * integrate(function (x) { return evalAt(x); }, -L, L, N);
  var latex = '\\frac{' + a0.toFixed(3) + '}{2}';
  for (var k = 1; k <= n; k++) {
    var ak = (1 / L) * integrate(function (x) { return evalAt(x) * Math.cos(k * Math.PI * x / L); }, -L, L, N);
    var bk = (1 / L) * integrate(function (x) { return evalAt(x) * Math.sin(k * Math.PI * x / L); }, -L, L, N);
    if (Math.abs(ak) > 1e-6) latex += ' + ' + ak.toFixed(3) + '\\cos\\!\\left(\\tfrac{' + k + '\\pi x}{L}\\right)';
    if (Math.abs(bk) > 1e-6) latex += ' + ' + bk.toFixed(3) + '\\sin\\!\\left(\\tfrac{' + k + '\\pi x}{L}\\right)';
  }
  return {
    ok: true,
    data: {
      a0: parseFloat(a0.toFixed(4)),
      latex: latex,
      n_terms: n,
      period: 2 * L
    }
  };
}`,
      },
      outputs: {
        panel: [
          { type: "latex", label: "f(x) ≈", value: "result.latex", displayMode: true },
          { type: "value", label: "a₀", value: "result.a0", precision: 5 },
          { type: "value", label: "period", value: "result.period" },
        ],
      },
      docs: "Computes Fourier coefficients numerically with trapezoid integration over [−L, L] and renders the partial sum in LaTeX.",
    },
  ],
};
