export const BUILTINS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, arctan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  sec:  (x) => 1 / Math.cos(x),
  csc:  (x) => 1 / Math.sin(x),
  cot:  (x) => 1 / Math.tan(x),
  asec: (x: number) => Math.acos(1 / x),
  acsc: (x: number) => Math.asin(1 / x),
  acot: (x: number) => Math.atan(1 / x),

  sqrt: Math.sqrt, cbrt: Math.cbrt, pow: Math.pow,

  abs: Math.abs, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,

  ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,

  min: Math.min, max: Math.max,
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
  lerp:  (a, b, t)   => a + (b - a) * t,
  mod:   (a, b)      => ((a % b) + b) % b,

  list: () => NaN,
};
