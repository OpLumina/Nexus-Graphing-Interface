import { describe, it, expect } from "vitest";
import { evaluate } from "../evaluator";
import { num, vari, cnst, binop, call, type ASTNode } from "../ast";

describe("evaluate — constants", () => {
  it("pi returns Math.PI", () => {
    expect(evaluate(cnst("pi"), {})).toBe(Math.PI);
  });

  it("e returns Math.E", () => {
    expect(evaluate(cnst("e"), {})).toBe(Math.E);
  });

  it("inf returns Infinity", () => {
    expect(evaluate(cnst("inf"), {})).toBe(Infinity);
  });
});

describe("evaluate — binary ops", () => {
  it("+ works", () => expect(evaluate(binop("+", num(2), num(3)), {})).toBe(5));
  it("- works", () => expect(evaluate(binop("-", num(5), num(2)), {})).toBe(3));
  it("* works", () => expect(evaluate(binop("*", num(2), num(3)), {})).toBe(6));
  it("/ works", () => expect(evaluate(binop("/", num(6), num(2)), {})).toBe(3));
  it("^ works", () => expect(evaluate(binop("^", num(2), num(3)), {})).toBe(8));

  it("unknown op returns NaN without throwing", () => {
    const node: ASTNode = { kind: "binary", op: "%" as never, left: num(2), right: num(3) };
    expect(() => evaluate(node, {})).not.toThrow();
    expect(evaluate(node, {})).toBeNaN();
  });

  it("unknown op does NOT fall through to call case", () => {
    // If binary fell through to call, it would try to call userFns/BUILTINS
    // with an args array — which is a different code path. The NaN return
    // from `default: return NaN` short-circuits before that.
    const spy: string[] = [];
    const node: ASTNode = { kind: "binary", op: "%" as never, left: num(1), right: num(2) };
    const userFns = {
      __probe__: (args: number[]) => { spy.push("called"); return args[0]; },
    };
    evaluate(node, {}, userFns);
    expect(spy).toHaveLength(0);
  });
});

describe("evaluate — higher-order derivatives use correct paramVar", () => {
  it("f''(x) with sliders in env returns ~2 for f(x)=x^2", () => {
    const userFns = {
      f: (args: number[]) => args[0] ** 2,
    };
    // env has slider 'a' as FIRST key — old code used Object.keys(env)[0]="a" as var
    const env = { a: 5, x: 3 };
    // f''(x) at x=3 should be 2, not 0
    const node = call("__prime____prime__f", [vari("x")]);
    const result = evaluate(node, env, userFns);
    // Nested numerical differentiation (h=1e-7) has ~2% error at 2nd order
    expect(result).toBeCloseTo(2, 1);
  });

  it("g''(t) with slider 'k' first in env uses t not k", () => {
    const userFns = {
      g: (args: number[]) => args[0] ** 3, // g(t) = t^3, g''(t) = 6t
    };
    const env = { k: 99, t: 2 };
    const node = call("__prime____prime__g", [vari("t")]);
    const result = evaluate(node, env, userFns);
    // g''(2) = 12; old buggy code returned 0 (used k not t as paramVar)
    expect(result).toBeCloseTo(12, 0);
  });
});

describe("evaluate — variables and unknown names", () => {
  it("bound variable returns value", () => {
    expect(evaluate(vari("x"), { x: 42 })).toBe(42);
  });

  it("unbound variable returns NaN", () => {
    expect(evaluate(vari("z"), {})).toBeNaN();
  });

  it("number node returns its value", () => {
    expect(evaluate(num(3.14), {})).toBe(3.14);
  });
});
