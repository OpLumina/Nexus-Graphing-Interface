// Converts a parsed AST / ParsedExpression to a LaTeX string for KaTeX rendering.

import { ASTNode, CallNode, ParsedExpression, DomainConstraint } from "./ast";

// ── Greek / variable name mapping ─────────────────────────────────────────────

const GREEK_TO_LATEX: Record<string, string> = {
  "θ": "\\theta", "α": "\\alpha", "β": "\\beta", "γ": "\\gamma",
  "δ": "\\delta", "ε": "\\varepsilon", "λ": "\\lambda", "μ": "\\mu",
  "ν": "\\nu",   "ρ": "\\rho",   "σ": "\\sigma", "τ": "\\tau",
  "φ": "\\phi",  "χ": "\\chi",   "ψ": "\\psi",   "ω": "\\omega",
};

function varToLatex(name: string): string {
  if (name in GREEK_TO_LATEX) return GREEK_TO_LATEX[name];
  if (name.length > 2) return `\\text{${name}}`;
  return name;
}

// ── Precedence helpers ────────────────────────────────────────────────────────

const PREC_ADD  = 1;
const PREC_MUL  = 2;
const PREC_POW  = 3;

function canImplicitMul(left: ASTNode, right: ASTNode): boolean {
  // 2x, 2\sin(x), 2\pi — left is a plain number, right is a named thing
  return left.kind === "number" &&
    (right.kind === "variable" || right.kind === "call" || right.kind === "constant");
}

// ── Core AST → LaTeX ─────────────────────────────────────────────────────────

function wrapIfNeeded(latex: string, prec: number, minPrec: number): string {
  return prec < minPrec ? `\\left(${latex}\\right)` : latex;
}

function astToLatex(node: ASTNode, minPrec = 0): string {
  switch (node.kind) {
    case "number": {
      const v = node.value;
      if (!isFinite(v)) return v > 0 ? "\\infty" : "-\\infty";
      return Number.isInteger(v) ? String(v) : String(parseFloat(v.toPrecision(6)));
    }

    case "variable":
      return varToLatex(node.name);

    case "constant":
      return node.name === "pi" ? "\\pi" : node.name === "e" ? "e" : "\\infty";

    case "unary": {
      if (node.op === "-") {
        const inner = astToLatex(node.operand, PREC_POW + 1);
        return wrapIfNeeded(`-${inner}`, PREC_MUL, minPrec);
      }
      return astToLatex(node.operand, minPrec);
    }

    case "binary": {
      if (node.op === "/") {
        // Always render as \frac — no parens needed
        return `\\frac{${astToLatex(node.left)}}{${astToLatex(node.right)}}`;
      }

      if (node.op === "^") {
        const base = astToLatex(node.left, PREC_POW + 1);
        const exp  = astToLatex(node.right);
        const result = `{${base}}^{${exp}}`;
        return wrapIfNeeded(result, PREC_POW, minPrec);
      }

      if (node.op === "*") {
        const left  = astToLatex(node.left, PREC_MUL);
        const right = astToLatex(node.right, PREC_MUL + 1);
        const body  = canImplicitMul(node.left, node.right)
          ? `${left}${right}`
          : `${left} \\cdot ${right}`;
        return wrapIfNeeded(body, PREC_MUL, minPrec);
      }

      // + or -
      const left  = astToLatex(node.left, PREC_ADD);
      const right = node.op === "-"
        ? astToLatex(node.right, PREC_ADD + 1)
        : astToLatex(node.right, PREC_ADD);
      const body = `${left} ${node.op} ${right}`;
      return wrapIfNeeded(body, PREC_ADD, minPrec);
    }

    case "call":
      return callToLatex(node);

    case "piecewise":
      return "\\ldots";

    case "error":
      return "\\text{?}";
  }
}

const TRIG_FNS: Record<string, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan",
  sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
  sec: "\\sec", csc: "\\csc", cot: "\\cot",
  ln: "\\ln", log: "\\log", min: "\\min", max: "\\max",
};

function callToLatex(node: CallNode): string {
  const { fn, args } = node;

  // Prime notation: __prime__f, __prime____prime__f, etc.
  if (fn.startsWith("__prime__")) {
    let rest = fn;
    let primeCount = 0;
    while (rest.startsWith("__prime__")) {
      primeCount++;
      rest = rest.slice("__prime__".length);
    }
    const base = varToLatex(rest);
    const primes = "'".repeat(primeCount);
    const argsStr = args.map(a => astToLatex(a)).join(", ");
    return `${base}${primes}\\left(${argsStr}\\right)`;
  }

  if (fn === "list") {
    return `\\left[${args.map(a => astToLatex(a)).join(",\\ ")}\\right]`;
  }
  if (fn === "sqrt") {
    if (args.length === 1) return `\\sqrt{${astToLatex(args[0])}}`;
    if (args.length === 2) return `\\sqrt[${astToLatex(args[1])}]{${astToLatex(args[0])}}`;
  }
  if (fn === "abs") return `\\left|${astToLatex(args[0])}\\right|`;
  if (fn === "exp") return `e^{${astToLatex(args[0])}}`;
  if (fn === "floor") return `\\lfloor ${astToLatex(args[0])} \\rfloor`;
  if (fn === "ceil")  return `\\lceil ${astToLatex(args[0])} \\rceil`;

  const latexName = TRIG_FNS[fn] ?? `\\operatorname{${fn}}`;
  const argsStr   = args.map(a => astToLatex(a)).join(", ");
  return `${latexName}\\left(${argsStr}\\right)`;
}

// ── Constraint rendering ──────────────────────────────────────────────────────

function constraintsToLatex(cs: DomainConstraint[]): string {
  if (cs.length === 0) return "";
  const parts = cs.map(c => {
    const v = varToLatex(c.variable);
    const pieces: string[] = [];
    if (c.lo) pieces.push(`${astToLatex(c.lo.value)} ${c.lo.inclusive ? "\\leq" : "<"} ${v}`);
    if (c.hi) pieces.push(`${v} ${c.hi.inclusive ? "\\leq" : "<"} ${astToLatex(c.hi.value)}`);
    // If only one side parsed, show it
    if (pieces.length === 2) return `${astToLatex(c.lo!.value)} ${c.lo!.inclusive ? "\\leq" : "<"} ${v} ${c.hi!.inclusive ? "\\leq" : "<"} ${astToLatex(c.hi!.value)}`;
    return pieces.join(",\\ ");
  });
  return `\\left\\{${parts.join(",\\ ")}\\right\\}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function toLatex(parsed: ParsedExpression): string {
  switch (parsed.type) {
    case "function": {
      const params = parsed.params.map(varToLatex).join(", ");
      const body   = astToLatex(parsed.body);
      const name   = varToLatex(parsed.name);
      const cs     = parsed.constraints ? constraintsToLatex(parsed.constraints) : "";
      return `${name}\\left(${params}\\right) = ${body}${cs ? "\\ " + cs : ""}`;
    }
    case "assignment": {
      const name = varToLatex(parsed.name);
      return `${name} = ${astToLatex(parsed.value)}`;
    }
    case "expression": {
      const cs = parsed.constraints ? constraintsToLatex(parsed.constraints) : "";
      return `${astToLatex(parsed.body)}${cs ? "\\ " + cs : ""}`;
    }
    case "equation": {
      const cs = parsed.constraints ? constraintsToLatex(parsed.constraints) : "";
      return `${astToLatex(parsed.lhs)} = ${astToLatex(parsed.rhs)}${cs ? "\\ " + cs : ""}`;
    }
    case "inequality": {
      const opMap: Record<string, string> = { "<": "<", ">": ">", "<=": "\\leq", ">=": "\\geq" };
      return `${astToLatex(parsed.lhs)} ${opMap[parsed.op] ?? parsed.op} ${astToLatex(parsed.rhs)}`;
    }
    case "reflect":
      return `\\operatorname{reflect}(${parsed.expr1},\\ ${parsed.expr2})`;
    case "error":
      return "";
  }
}
