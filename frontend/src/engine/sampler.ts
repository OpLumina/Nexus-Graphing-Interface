import { ASTNode, ParsedExpression, DomainConstraint, freeVariables } from "./ast";
import { evaluate, Env, UserFns } from "./evaluator";

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface SampledCurve {
  points: Float32Array;
  kind: "cartesian" | "parametric" | "polar" | "implicit" | "inequality";
}

function evalBound(val: ASTNode, env: Env, userFns: UserFns): number {
  return evaluate(val, env, userFns);
}

function xInDomain(x: number, constraints: DomainConstraint[] | undefined, env: Env, userFns: UserFns): boolean {
  if (!constraints) return true;
  for (const c of constraints) {
    if (c.variable !== "x") continue;
    if (c.lo) {
      const lo = evalBound(c.lo.value, env, userFns);
      if (c.lo.inclusive ? x < lo : x <= lo) return false;
    }
    if (c.hi) {
      const hi = evalBound(c.hi.value, env, userFns);
      if (c.hi.inclusive ? x > hi : x >= hi) return false;
    }
  }
  return true;
}

function yInRange(y: number, constraints: DomainConstraint[] | undefined, env: Env, userFns: UserFns): boolean {
  if (!constraints) return true;
  for (const c of constraints) {
    if (c.variable !== "y") continue;
    if (c.lo) {
      const lo = evalBound(c.lo.value, env, userFns);
      if (c.lo.inclusive ? y < lo : y <= lo) return false;
    }
    if (c.hi) {
      const hi = evalBound(c.hi.value, env, userFns);
      if (c.hi.inclusive ? y > hi : y >= hi) return false;
    }
  }
  return true;
}

function bisectDomainBoundary(
  x0: number, x1: number, in0: boolean,
  constraints: DomainConstraint[], env: Env, userFns: UserFns,
): number {
  for (let i = 0; i < 12; i++) {
    const mid = (x0 + x1) / 2;
    if (xInDomain(mid, constraints, env, userFns) === in0) x0 = mid;
    else x1 = mid;
  }
  return in0 ? x0 : x1;
}

function adaptiveRefine(
  fn: (x: number) => number,
  x0: number, x1: number, y0: number, y1: number,
  yRange: number, depth: number, out: number[],
): void {
  if (depth === 0) { out.push(x1, y1); return; }
  const xm = (x0 + x1) / 2;
  const ym = fn(xm);
  if (Math.abs(ym - (y0 + y1) / 2) > yRange * 0.002) {
    adaptiveRefine(fn, x0, xm, y0, ym, yRange, depth - 1, out);
    adaptiveRefine(fn, xm, x1, ym, y1, yRange, depth - 1, out);
  } else {
    out.push(x1, y1);
  }
}

function sampleCartesian(
  fn: (x: number) => number,
  viewport: Viewport,
  baseN = 600,
  constraints?: DomainConstraint[],
  env?: Env,
  userFns?: UserFns,
): Float32Array {
  const { xMin, xMax } = viewport;
  const yRange = Math.abs(viewport.yMax - viewport.yMin);
  const safeEnv = env ?? {};
  const safeFns = userFns ?? {};
  const hasConstraints = !!(constraints && constraints.length > 0);

  const step = (xMax - xMin) / baseN;
  const out: number[] = [];

  let prevInDomain = hasConstraints ? xInDomain(xMin, constraints, safeEnv, safeFns) : true;
  let prevX = xMin;
  let prevY = fn(xMin);

  if (prevInDomain) {
    const yOk = isFinite(prevY) && yInRange(prevY, constraints, safeEnv, safeFns);
    out.push(prevX, yOk ? prevY : NaN);
  } else {
    out.push(prevX, NaN);
  }

  for (let i = 1; i <= baseN; i++) {
    const x = i === baseN ? xMax : xMin + i * step;
    const inDomain = hasConstraints ? xInDomain(x, constraints, safeEnv, safeFns) : true;

    if (hasConstraints && inDomain !== prevInDomain) {
      const bx = bisectDomainBoundary(prevX, x, prevInDomain, constraints!, safeEnv, safeFns);
      const by = fn(bx);
      if (prevInDomain) {
        out.push(bx, isFinite(by) ? by : NaN);
        out.push(NaN, NaN);
      } else {
        out.push(NaN, NaN);
        out.push(bx, isFinite(by) ? by : NaN);
      }
    }

    const y = fn(x);
    if (!inDomain || !isFinite(y) || !yInRange(y, constraints, safeEnv, safeFns)) {
      const lastIsNaN = out.length >= 2 && !isFinite(out[out.length - 1]);
      if (!lastIsNaN) out.push(x, NaN);
    } else {
      const lastYOk = out.length >= 4 && isFinite(out[out.length - 1]);
      if (lastYOk && inDomain && prevInDomain) {
        adaptiveRefine(fn, prevX, x, prevY, y, yRange, 3, out);
      } else {
        out.push(x, y);
      }
    }

    prevX = x;
    prevY = y;
    prevInDomain = inDomain;
  }

  return new Float32Array(out);
}

function sampleParametric(
  xFn: (t: number) => number,
  yFn: (t: number) => number,
  tMin = 0,
  tMax = 2 * Math.PI,
  n = 800,
): Float32Array {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = tMin + (i / n) * (tMax - tMin);
    out.push(xFn(t), yFn(t));
  }
  return new Float32Array(out);
}

function samplePolar(
  rFn: (theta: number) => number,
  thetaMin = 0,
  thetaMax = 2 * Math.PI,
  n = 800,
): Float32Array {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const theta = thetaMin + (i / n) * (thetaMax - thetaMin);
    const r = rFn(theta);
    out.push(r * Math.cos(theta), r * Math.sin(theta));
  }
  return new Float32Array(out);
}

function sampleImplicit(
  f: (x: number, y: number) => number,
  viewport: Viewport,
  res = 200,
): Float32Array {
  const { xMin, xMax, yMin, yMax } = viewport;
  const dx = (xMax - xMin) / res;
  const dy = (yMax - yMin) / res;

  const grid = new Float64Array((res + 1) * (res + 1));
  for (let j = 0; j <= res; j++) {
    const y = yMin + j * dy;
    for (let i = 0; i <= res; i++) {
      const x = xMin + i * dx;
      grid[j * (res + 1) + i] = f(x, y);
    }
  }

  const segs: number[] = [];
  const G = (i: number, j: number) => grid[j * (res + 1) + i];

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x0 = xMin + i * dx, x1 = x0 + dx;
      const y0 = yMin + j * dy, y1 = y0 + dy;
      const v00 = G(i, j), v10 = G(i + 1, j);
      const v01 = G(i, j + 1), v11 = G(i + 1, j + 1);

      const pts: [number, number][] = [];
      const interp = (a: number, b: number) => a / (a - b);

      if (v00 * v10 < 0) { const t = interp(v00, v10); pts.push([x0 + t * dx, y0]); }
      if (v01 * v11 < 0) { const t = interp(v01, v11); pts.push([x0 + t * dx, y1]); }
      if (v00 * v01 < 0) { const t = interp(v00, v01); pts.push([x0, y0 + t * dy]); }
      if (v10 * v11 < 0) { const t = interp(v10, v11); pts.push([x1, y0 + t * dy]); }

      if (pts.length === 2) {
        segs.push(pts[0][0], pts[0][1], pts[1][0], pts[1][1], NaN, NaN);
      } else if (pts.length === 4) {
        segs.push(pts[0][0], pts[0][1], pts[1][0], pts[1][1], NaN, NaN);
        segs.push(pts[2][0], pts[2][1], pts[3][0], pts[3][1], NaN, NaN);
      }
    }
  }

  return new Float32Array(segs);
}

export function sampleExpression(
  parsed: ParsedExpression,
  env: Env,
  viewport: Viewport,
  userFns: UserFns = {},
): SampledCurve | null {
  const baseEnv = { ...env };
  const constraints = (parsed as { constraints?: DomainConstraint[] }).constraints;

  switch (parsed.type) {
    case "function": {
      if (parsed.params.length !== 1) return null;
      const param = parsed.params[0];
      const body = parsed.body;

      if (param === "θ" || param === "theta") {
        const points = samplePolar(
          (theta) => evaluate(body, { ...baseEnv, [param]: theta }, userFns),
        );
        return { points, kind: "polar" };
      }

      if (param === "t") {
        // Treat t as the horizontal axis and sample across the visible x-range
        // so the curve re-samples on pan/zoom instead of staying pinned to a
        // fixed [0, 2π] window and sliding off-screen (BUG-4).
        const points = sampleCartesian(
          (t) => evaluate(body, { ...baseEnv, t }, userFns),
          viewport, 600, constraints, baseEnv, userFns,
        );
        return { points, kind: "cartesian" };
      }

      const points = sampleCartesian(
        (x) => evaluate(body, { ...baseEnv, [param]: x }, userFns),
        viewport, 600, constraints, baseEnv, userFns,
      );
      return { points, kind: "cartesian" };
    }

    case "expression": {
      const body = parsed.body;
      const points = sampleCartesian(
        (x) => evaluate(body, { ...baseEnv, x }, userFns),
        viewport, 600, constraints, baseEnv, userFns,
      );
      return { points, kind: "cartesian" };
    }

    case "equation": {
      const { lhs, rhs } = parsed;
      if (rhs.kind === "variable" && rhs.name === "y") {
        const points = sampleCartesian(
          (x) => evaluate(lhs, { ...baseEnv, x }, userFns),
          viewport, 600, constraints, baseEnv, userFns,
        );
        return { points, kind: "cartesian" };
      }
      if (lhs.kind === "variable" && lhs.name === "y") {
        const points = sampleCartesian(
          (x) => evaluate(rhs, { ...baseEnv, x }, userFns),
          viewport, 600, constraints, baseEnv, userFns,
        );
        return { points, kind: "cartesian" };
      }
      const f = (x: number, y: number) =>
        evaluate(lhs, { ...baseEnv, x, y }, userFns) -
        evaluate(rhs, { ...baseEnv, x, y }, userFns);
      return { points: sampleImplicit(f, viewport), kind: "implicit" };
    }

    case "inequality": {
      const { lhs, rhs } = parsed;
      const f = (x: number, y: number) =>
        evaluate(lhs, { ...baseEnv, x, y }, userFns) -
        evaluate(rhs, { ...baseEnv, x, y }, userFns);
      return { points: sampleImplicit(f, viewport), kind: "inequality" };
    }

    default:
      return null;
  }
}

export function sampleWithLists(
  parsed: ParsedExpression,
  env: Env,
  viewport: Viewport,
  userFns: UserFns,
  listAssignments: Record<string, number[]>,
): SampledCurve[] {
  const knownFns = new Set(Object.keys(userFns));
  let freeVars = new Set<string>();
  if (parsed.type === "function" || parsed.type === "expression") {
    freeVars = freeVariables(parsed.body, knownFns);
  } else if (parsed.type === "equation") {
    freeVariables(parsed.lhs, knownFns).forEach(v => freeVars.add(v));
    freeVariables(parsed.rhs, knownFns).forEach(v => freeVars.add(v));
  }

  if (freeVars.size > 0) {
    const listVar = [...freeVars].find(v => v in listAssignments && listAssignments[v].length > 0);
    if (listVar) {
      return listAssignments[listVar]
        .map(val => sampleExpression(parsed, { ...env, [listVar]: val }, viewport, userFns))
        .filter((c): c is SampledCurve => c !== null);
    }
  }

  const curve = sampleExpression(parsed, env, viewport, userFns);
  return curve ? [curve] : [];
}

export function sampleParametricPair(
  xBody: ASTNode,
  yBody: ASTNode,
  env: Env,
  tMin = 0,
  tMax = 2 * Math.PI,
  userFns: UserFns = {},
): SampledCurve {
  const points = sampleParametric(
    (t) => evaluate(xBody, { ...env, t }, userFns),
    (t) => evaluate(yBody, { ...env, t }, userFns),
    tMin,
    tMax,
  );
  return { points, kind: "parametric" };
}
