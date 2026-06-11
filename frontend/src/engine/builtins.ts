// All built-in math functions available to the parser/evaluator.
// Adding a function = one line here, nothing else changes.

function gammaFn(z: number): number {
  // Lanczos approximation
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function factorialFn(n: number): number {
  if (n < 0) return NaN;
  if (Number.isInteger(n) && n <= 170) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  return gammaFn(n + 1);
}

function gcdFn(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function nthrootFn(x: number, n: number): number {
  if (n === 0) return NaN;
  if (x < 0) {
    // odd integer roots of negatives are real
    return Math.round(n) === n && Math.abs(n) % 2 === 1
      ? -Math.pow(-x, 1 / n)
      : NaN;
  }
  return Math.pow(x, 1 / n);
}

export const BUILTINS: Record<string, (...args: number[]) => number> = {
  // Trig
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, arctan2: Math.atan2,
  sec:  (x) => 1 / Math.cos(x),
  csc:  (x) => 1 / Math.sin(x),
  cot:  (x) => 1 / Math.tan(x),
  asec: (x) => Math.acos(1 / x),
  acsc: (x) => Math.asin(1 / x),
  acot: (x) => Math.atan(1 / x),
  arcsec: (x) => Math.acos(1 / x),
  arccsc: (x) => Math.asin(1 / x),
  arccot: (x) => Math.atan(1 / x),

  // Hyperbolic
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  arcsinh: Math.asinh, arccosh: Math.acosh, arctanh: Math.atanh,
  sech: (x) => 1 / Math.cosh(x),
  csch: (x) => 1 / Math.sinh(x),
  coth: (x) => 1 / Math.tanh(x),

  // Roots & powers
  sqrt: Math.sqrt, cbrt: Math.cbrt, pow: Math.pow,
  nthroot: nthrootFn,
  root: nthrootFn,
  hypot: Math.hypot,

  // Rounding & parts
  abs: Math.abs, sign: Math.sign, sgn: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, trunc: Math.trunc,
  frac: (x) => x - Math.floor(x),

  // Exp & log
  ln: Math.log, log: Math.log10, log2: Math.log2, log10: Math.log10,
  exp: Math.exp, expm1: Math.expm1, log1p: Math.log1p,
  logb: (x, b) => Math.log(x) / Math.log(b),

  // Combinatorics & number theory
  factorial: factorialFn,
  gamma: gammaFn,
  ncr: (n, r) => Math.round(factorialFn(n) / (factorialFn(r) * factorialFn(n - r))),
  npr: (n, r) => Math.round(factorialFn(n) / factorialFn(n - r)),
  gcd: gcdFn,
  lcm: (a, b) => {
    const g = gcdFn(a, b);
    return g === 0 ? 0 : Math.abs(Math.round(a) * Math.round(b)) / g;
  },

  // Misc numeric
  min: Math.min, max: Math.max,
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
  lerp:  (a, b, t)   => a + (b - a) * t,
  mod:   (a, b)      => ((a % b) + b) % b,
  sinc:  (x) => x === 0 ? 1 : Math.sin(x) / x,
  step:  (x) => x < 0 ? 0 : 1,
  heaviside: (x) => x < 0 ? 0 : 1,
  deg:   (x) => x * 180 / Math.PI,
  rad:   (x) => x * Math.PI / 180,

  list: () => NaN,
};
