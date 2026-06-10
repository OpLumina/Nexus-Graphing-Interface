import { ASTNode } from "./ast";
import { BUILTINS } from "./builtins";

export type Env = Record<string, number>;
export type UserFns = Record<string, (args: number[]) => number>;

export function evaluate(node: ASTNode, env: Env, userFns: UserFns = {}): number {
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
      const args = node.args.map(a => evaluate(a, env, userFns));

      if (node.fn.startsWith("__prime__")) {
        const inner = node.fn.slice("__prime__".length);
        const paramVar = node.args[0]?.kind === "variable" ? node.args[0].name : "x";
        const callInner = (xv: number): number => {
          if (inner.startsWith("__prime__")) {
            return evaluate({ ...node, fn: inner }, { ...env, [paramVar]: xv }, userFns);
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

export function evaluateBool(node: ASTNode, env: Env, userFns: UserFns = {}): boolean {
  const v = evaluate(node, env, userFns);
  return v !== 0 && !Number.isNaN(v);
}
