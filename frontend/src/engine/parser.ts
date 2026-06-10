import {
  ASTNode, ParsedExpression, DomainConstraint,
  num, vari, cnst, binop, unary, call,
} from "./ast";

type TokenKind =
  | "number" | "ident" | "+"  | "-"  | "*"  | "/"  | "^"
  | "("      | ")"     | "["  | "]"  | "{"  | "}"
  | ","      | "="     | "<"  | ">"  | "<=" | ">="
  | "!="     | "'"     | "EOF";

interface Token { kind: TokenKind; value: string; pos: number }

const GREEK: Record<string, string> = {
  alpha:"α", beta:"β", gamma:"γ", delta:"δ", epsilon:"ε",
  theta:"θ", lambda:"λ", mu:"μ", nu:"ν", pi:"π", rho:"ρ",
  sigma:"σ", tau:"τ", phi:"φ", chi:"χ", psi:"ψ", omega:"ω",
  "α":"α","β":"β","γ":"γ","δ":"δ","θ":"θ","λ":"λ","π":"π","ω":"ω",
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j), pos: i });
      i = j; continue;
    }
    if (/[a-zA-Zα-ωΑ-Ω_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Zα-ωΑ-Ω_0-9]/.test(src[j])) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j), pos: i });
      i = j; continue;
    }
    if (ch === "'") { tokens.push({ kind: "'", value: "'", pos: i }); i++; continue; }
    if (ch === "<" && src[i + 1] === "=") { tokens.push({ kind: "<=", value: "<=", pos: i }); i += 2; continue; }
    if (ch === ">" && src[i + 1] === "=") { tokens.push({ kind: ">=", value: ">=", pos: i }); i += 2; continue; }
    if (ch === "!" && src[i + 1] === "=") { tokens.push({ kind: "!=", value: "!=", pos: i }); i += 2; continue; }
    const single: TokenKind | undefined = ({
      "+":"+", "-":"-", "*":"*", "/":"/", "^":"^",
      "(":"(", ")":")", "[":"[", "]":"]", "{":"{", "}":"}",
      ",":","," =":"=", "=":"=", "<":"<", ">":">",
    } as Record<string, TokenKind>)[ch];
    if (single) { tokens.push({ kind: single, value: ch, pos: i }); i++; continue; }
    i++;
  }
  tokens.push({ kind: "EOF", value: "", pos: src.length });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(src: string) {
    this.tokens = tokenize(src);
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private eat(kind: TokenKind): Token {
    const t = this.peek();
    if (t.kind !== kind) throw new Error(`Expected ${kind}, got ${t.kind} ("${t.value}")`);
    return this.advance();
  }
  private at(...kinds: TokenKind[]): boolean { return kinds.includes(this.peek().kind); }

  parseFull(): ParsedExpression {
    try {
      return this.parseTop();
    } catch (e) {
      return { type: "error", message: String(e), raw: "" };
    }
  }

  private parseTop(): ParsedExpression {
    if (this.at("ident")) {
      const saved = this.pos;
      const name = this.advance().value;
      if (name === "reflect" && this.at("(")) {
        this.advance();
        if (this.at("ident")) {
          const e1 = this.advance().value;
          if (this.at(",")) {
            this.advance();
            if (this.at("ident")) {
              const e2 = this.advance().value;
              if (this.at(")")) {
                this.advance();
                return { type: "reflect", expr1: e1, expr2: e2 };
              }
            }
          }
        }
        this.pos = saved;
      } else {
        this.pos = saved;
      }
    }

    if (this.at("ident")) {
      const saved = this.pos;
      const name = this.advance().value;
      if (this.at("(")) {
        this.advance();
        const params: string[] = [];
        if (!this.at(")")) {
          params.push(this.eat("ident").value);
          while (this.at(",")) { this.advance(); params.push(this.eat("ident").value); }
        }
        this.eat(")");
        if (this.at("=")) {
          this.advance();
          const body = this.parseExpr();
          const constraints = this.at("{") ? this.parseConstraintBlock() : undefined;
          return { type: "function", name, params, body, constraints };
        }
        this.pos = saved;
      } else if (this.at("=")) {
        this.advance();
        const value = this.parseExpr();
        if (name === "y" || name === "r") {
          const constraints = this.at("{") ? this.parseConstraintBlock() : undefined;
          return { type: "equation", lhs: vari(name), rhs: value, constraints };
        }
        return { type: "assignment", name, value };
      } else {
        this.pos = saved;
      }
    }

    const lhs = this.parseExpr();

    if (this.at("="))  { this.advance(); const rhs = this.parseExpr(); const constraints = this.at("{") ? this.parseConstraintBlock() : undefined; return { type: "equation", lhs, rhs, constraints }; }
    if (this.at("<"))  { this.advance(); return { type: "inequality", lhs, op: "<",  rhs: this.parseExpr() }; }
    if (this.at(">"))  { this.advance(); return { type: "inequality", lhs, op: ">",  rhs: this.parseExpr() }; }
    if (this.at("<=")) { this.advance(); return { type: "inequality", lhs, op: "<=", rhs: this.parseExpr() }; }
    if (this.at(">=")) { this.advance(); return { type: "inequality", lhs, op: ">=", rhs: this.parseExpr() }; }

    const constraints = this.at("{") ? this.parseConstraintBlock() : undefined;
    return { type: "expression", body: lhs, constraints };
  }

  private parseExpr(): ASTNode { return this.parseAddSub(); }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.at("+", "-")) {
      const op = this.advance().value as "+" | "-";
      left = binop(op, left, this.parseMulDiv());
    }
    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parseImplicitMul();
    while (this.at("*", "/")) {
      const op = this.advance().value as "*" | "/";
      left = binop(op, left, this.parseImplicitMul());
    }
    return left;
  }

  private parseImplicitMul(): ASTNode {
    let left = this.parsePower();
    while (
      this.at("number", "ident", "(") ||
      (this.at("ident") && !["EOF", ")", "]", "}", ",", "=", "<", ">", "<=", ">="].includes(this.peek().kind))
    ) {
      const next = this.peek().kind;
      if (["EOF", ")", "]", "}", ",", "=", "<", ">", "<=", ">=", "+", "-", "*", "/", "^"].includes(next)) break;
      left = binop("*", left, this.parsePower());
    }
    return left;
  }

  private parsePower(): ASTNode {
    const base = this.parseUnary();
    if (this.at("^")) {
      this.advance();
      return binop("^", base, this.parseUnary());
    }
    return base;
  }

  private parseUnary(): ASTNode {
    if (this.at("-")) { this.advance(); return unary("-", this.parsePrimary()); }
    if (this.at("+")) { this.advance(); return this.parsePrimary(); }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    if (t.kind === "number") {
      this.advance();
      return num(parseFloat(t.value));
    }

    if (t.kind === "(") {
      this.advance();
      const inner = this.parseExpr();
      this.eat(")");
      return inner;
    }

    if (t.kind === "[") {
      this.advance();
      const items: ASTNode[] = [];
      if (!this.at("]")) {
        items.push(this.parseExpr());
        while (this.at(",")) { this.advance(); items.push(this.parseExpr()); }
      }
      this.eat("]");
      return call("list", items);
    }

    if (t.kind === "ident") {
      this.advance();
      const name = t.value;

      if (name === "pi" || name === "π") return cnst("pi");
      if (name === "e")                  return cnst("e");
      if (name === "inf" || name === "∞") return cnst("inf");

      const resolved = GREEK[name] ?? name;

      if (this.at("'")) {
        let primes = 0;
        while (this.at("'")) { this.advance(); primes++; }
        const primeName = "__prime__".repeat(primes) + resolved;
        if (this.at("(")) {
          this.advance();
          const args: ASTNode[] = [];
          if (!this.at(")")) {
            args.push(this.parseExpr());
            while (this.at(",")) { this.advance(); args.push(this.parseExpr()); }
          }
          this.eat(")");
          return call(primeName, args);
        }
        return vari(primeName);
      }

      if (this.at("(")) {
        this.advance();
        const args: ASTNode[] = [];
        if (!this.at(")")) {
          args.push(this.parseExpr());
          while (this.at(",")) { this.advance(); args.push(this.parseExpr()); }
        }
        this.eat(")");
        return call(resolved, args);
      }

      return vari(resolved);
    }

    throw new Error(`Unexpected token: ${t.kind} ("${t.value}")`);
  }

  private parseConstraintBlock(): DomainConstraint[] {
    this.eat("{");
    const constraints: DomainConstraint[] = [];
    while (!this.at("}", "EOF")) {
      const prevPos = this.pos;
      const c = this.tryParseOneConstraint();
      if (c) constraints.push(c);
      if (this.at(",")) this.advance();
      if (this.pos === prevPos) this.advance();
    }
    if (this.at("}")) this.advance();
    return constraints;
  }

  private tryParseOneConstraint(): DomainConstraint | null {
    const saved = this.pos;
    try {
      if (this.at("ident")) {
        const varTok = this.peek();
        if (varTok.value === "x" || varTok.value === "y") {
          this.advance();
          const variable = varTok.value as "x" | "y";
          if (this.at("<", ">", "<=", ">=")) {
            const op = this.advance().kind as "<" | ">" | "<=" | ">=";
            const val = this.parseExpr();
            if (op === "<" || op === "<=") return { variable, hi: { value: val, inclusive: op === "<=" } };
            return { variable, lo: { value: val, inclusive: op === ">=" } };
          }
          this.pos = saved;
        }
      }

      const val1 = this.parseExpr();
      if (!this.at("<", ">", "<=", ">=")) { this.pos = saved; return null; }
      const op1 = this.advance().kind as "<" | ">" | "<=" | ">=";
      if (!this.at("ident")) { this.pos = saved; return null; }
      const varName = this.peek().value;
      if (varName !== "x" && varName !== "y") { this.pos = saved; return null; }
      this.advance();
      const variable = varName as "x" | "y";

      const constraint: DomainConstraint = { variable };
      if (op1 === "<" || op1 === "<=") {
        constraint.lo = { value: val1, inclusive: op1 === "<=" };
      } else {
        constraint.hi = { value: val1, inclusive: op1 === ">=" };
      }

      if (this.at("<", ">", "<=", ">=")) {
        const op2 = this.advance().kind as "<" | ">" | "<=" | ">=";
        const val2 = this.parseExpr();
        if (op2 === "<" || op2 === "<=") {
          constraint.hi = { value: val2, inclusive: op2 === "<=" };
        } else {
          constraint.lo = { value: val2, inclusive: op2 === ">=" };
        }
      }
      return constraint;
    } catch {
      this.pos = saved;
      return null;
    }
  }
}

export function parse(raw: string): ParsedExpression {
  if (!raw.trim()) return { type: "error", message: "empty", raw };
  const parser = new Parser(raw.trim());
  const result = parser.parseFull();
  if (result.type === "error") return { ...result, raw };
  return result;
}
