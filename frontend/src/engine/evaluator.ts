import { ASTNode, num } from "./ast";
import { BUILTINS } from "./builtins";

export type Env = Record<string, number>;
export type UserFns = Record<string, (args: number[]) => number>;

// Backstop against cyclic definitions (e.g. `f(x) = f(x)`), which would
// otherwise recurse until a stack overflow. Returning NaN unwinds gracefully.
//
// The guard counts *function-call* recursion only — not every AST node — so a
// deeply nested but legitimate expression (e.g. a 500-term sum) is not falsely
// tripped (BUG-3). Only cyclic definitions accumulate call depth without bound.
//
// ARCH-8: this NaN return is a silent *runtime* backstop, not the user-facing
// signal. Cyclic/mutually-recursive definitions are detected up front by the
// store's dependency graph and surfaced as the `CYCLE_ERROR` ("circular
// reference") annotation on the offending expression (BUG-9, store.ts), so the
// user sees an explicit error rather than only an empty (NaN) plot. The 256 cap
// is therefore a defence-in-depth limit on call-recursion *depth*: it bounds any
// cycle the graph analysis misses (e.g. data-dependent indirect recursion) and
// caps composition nesting. It is intentionally generous (deep-but-valid
// composition well under 256 is unaffected); a composition chain longer than
// this collapses to NaN by design.
const MAX_CALL_DEPTH = 256;
let callDepth = 0;

export function evaluate(node: ASTNode, env: Env, userFns: UserFns = {}): number {
  return evalNode(node, env, userFns);
}

function evalNode(node: ASTNode, env: Env, userFns: UserFns): number {
  switch (node.kind) {
    case "number":
      return node.value;

    case "constant":
      switch (node.name) {
        case "pi":  return Math.PI;
        case "e":   return Math.E;
        case "inf": return Infinity;
        default:    return NaN;
      }

    case "variable": {
      const v = env[node.name];
      return v !== undefined ? v : NaN;
    }

    case "unary":
      return node.op === "-"
        ? -evaluate(node.operand, env, userFns)
        :  evaluate(node.operand, env, userFns);

    case "binary": {
      const l = evaluate(node.left,  env, userFns);
      const r = evaluate(node.right, env, userFns);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "^": return Math.pow(l, r);
        default:  return NaN;
      }
    }

    case "call": {
      if (callDepth >= MAX_CALL_DEPTH) return NaN;
      callDepth++;
      try {
        return evalCall(node, env, userFns);
      } finally {
        callDepth--;
      }
    }

    case "piecewise": {
      for (const branch of node.branches) {
        const cond = evaluate(branch.condition, env, userFns);
        if (cond !== 0 && !Number.isNaN(cond)) return evaluate(branch.value, env, userFns);
      }
      return node.otherwise ? evaluate(node.otherwise, env, userFns) : NaN;
    }

    case "error":
      return NaN;
  }
}

function evalCall(node: Extract<ASTNode, { kind: "call" }>, env: Env, userFns: UserFns): number {
  const args = node.args.map(a => evaluate(a, env, userFns));

  if (node.fn.startsWith("__prime__")) {
    const inner = node.fn.slice("__prime__".length);
    const callInner = (xv: number): number => {
      if (inner.startsWith("__prime__")) {
        // Recurse on the numeric perturbation point itself; substitute it as
        // the first arg so literal/compound arguments (f''(2), f''(2x)) work.
        return evaluate(
          { ...node, fn: inner, args: [num(xv), ...node.args.slice(1)] },
          env, userFns,
        );
      }
      const ufn2 = userFns[inner];
      if (ufn2) return ufn2([xv, ...args.slice(1)]);
      const bfn = BUILTINS[inner];
      if (bfn) return bfn(xv, ...args.slice(1));
      return NaN;
    };
    const h = 1e-7;
    const x0 = args[0] ?? NaN;
    return (callInner(x0 + h) - callInner(x0 - h)) / (2 * h);
  }

  const ufn = userFns[node.fn];
  if (ufn) return ufn(args);
  const fn = BUILTINS[node.fn];
  if (!fn) return NaN;
  return fn(...args);
}

export function evaluateBool(node: ASTNode, env: Env, userFns: UserFns = {}): boolean {
  const v = evaluate(node, env, userFns);
  return v !== 0 && !Number.isNaN(v);
}
