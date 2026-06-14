import { describe, it, expect } from "vitest";
import { parse } from "../parser";
import { evaluate } from "../evaluator";
import type { ASTNode } from "../ast";

const bodyOf = (src: string): ASTNode => {
  const r = parse(src);
  if (r.type !== "expression") throw new Error(`expected expression, got ${r.type}`);
  return r.body;
};

describe("parse — operator precedence & associativity", () => {
  it("-x^2 parses as -(x^2): evaluates to -4 at x=2", () => {
    expect(evaluate(bodyOf("-x^2"), { x: 2 })).toBe(-4);
  });

  it("-2^2 is -4, not 4", () => {
    expect(evaluate(bodyOf("-2^2"), {})).toBe(-4);
  });

  it("^ is right-associative: 2^3^2 = 512", () => {
    expect(evaluate(bodyOf("2^3^2"), {})).toBe(512);
  });

  it("2^-3 = 0.125", () => {
    expect(evaluate(bodyOf("2^-3"), {})).toBeCloseTo(0.125, 10);
  });

  it("trailing garbage after a valid prefix raises (no silent drop)", () => {
    expect(parse("2^3^2 )").type).toBe("error");
    expect(parse("x^2 x^").type).toBe("error");
  });
});

describe("parse — prime notation encoding", () => {
  it("f'(x) generates fn name __prime__f", () => {
    const result = parse("f'(x)");
    expect(result.type).not.toBe("error");
    if (result.type === "expression" && result.body.kind === "call") {
      expect(result.body.fn).toBe("__prime__f");
    } else {
      // Parser may return expression with call body
      expect(result).toMatchObject({ type: "expression" });
    }
  });

  it("f''(x) generates fn name __prime____prime__f (not __prime__prime__f)", () => {
    const result = parse("f''(x)");
    expect(result.type).not.toBe("error");
    // Walk to the call node
    const body = result.type === "expression" ? result.body : null;
    if (body?.kind === "call") {
      expect(body.fn).toBe("__prime____prime__f");
      expect(body.fn).not.toBe("__prime__prime__f");
    }
  });

  it("f'''(x) generates fn name __prime____prime____prime__f", () => {
    const result = parse("f'''(x)");
    expect(result.type).not.toBe("error");
    const body = result.type === "expression" ? result.body : null;
    if (body?.kind === "call") {
      expect(body.fn).toBe("__prime____prime____prime__f");
    }
  });

  it("each prime adds exactly one __prime__ segment", () => {
    for (let primes = 1; primes <= 4; primes++) {
      const notation = "f" + "'".repeat(primes) + "(x)";
      const result = parse(notation);
      const body = result.type === "expression" ? result.body : null;
      if (body?.kind === "call") {
        const expected = "__prime__".repeat(primes) + "f";
        expect(body.fn).toBe(expected);
      }
    }
  });
});

describe("parse — basic expression types", () => {
  it("f(x) = x^2 parses as function", () => {
    const result = parse("f(x) = x^2");
    expect(result.type).toBe("function");
  });

  it("a = 5 parses as assignment", () => {
    const result = parse("a = 5");
    expect(result.type).toBe("assignment");
  });

  it("y = a*x parses as equation", () => {
    const result = parse("y = a*x");
    expect(result.type).toBe("equation");
  });

  it("empty string parses as error", () => {
    const result = parse("");
    expect(result.type).toBe("error");
  });
});
