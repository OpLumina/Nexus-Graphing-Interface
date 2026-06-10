export type NumberNode   = { kind: "number";   value: number };
export type VariableNode = { kind: "variable"; name: string };
export type ConstantNode = { kind: "constant"; name: "pi" | "e" | "inf" };
export type BinaryNode   = { kind: "binary";   op: "+" | "-" | "*" | "/" | "^"; left: ASTNode; right: ASTNode };
export type UnaryNode    = { kind: "unary";    op: "-" | "+"; operand: ASTNode };
export type CallNode     = { kind: "call";     fn: string; args: ASTNode[] };
export type PiecewiseNode = { kind: "piecewise"; branches: { condition: ASTNode; value: ASTNode }[]; otherwise: ASTNode | null };
export type ErrorNode    = { kind: "error";    message: string; raw: string };

export type ASTNode =
  | NumberNode
  | VariableNode
  | ConstantNode
  | BinaryNode
  | UnaryNode
  | CallNode
  | PiecewiseNode
  | ErrorNode;

export interface DomainConstraint {
  variable: "x" | "y";
  lo?: { value: ASTNode; inclusive: boolean };
  hi?: { value: ASTNode; inclusive: boolean };
}

export type ParsedExpression =
  | { type: "function";   name: string; params: string[]; body: ASTNode; constraints?: DomainConstraint[] }
  | { type: "assignment"; name: string; value: ASTNode }
  | { type: "equation";   lhs: ASTNode; rhs: ASTNode; constraints?: DomainConstraint[] }
  | { type: "inequality"; lhs: ASTNode; op: "<" | ">" | "<=" | ">="; rhs: ASTNode }
  | { type: "expression"; body: ASTNode; constraints?: DomainConstraint[] }
  | { type: "reflect";    expr1: string; expr2: string }
  | { type: "error";      message: string; raw: string };

export const num   = (value: number): NumberNode   => ({ kind: "number", value });
export const vari  = (name: string): VariableNode  => ({ kind: "variable", name });
export const cnst  = (name: ConstantNode["name"]): ConstantNode => ({ kind: "constant", name });
export const binop = (op: BinaryNode["op"], left: ASTNode, right: ASTNode): BinaryNode => ({ kind: "binary", op, left, right });
export const unary = (op: UnaryNode["op"], operand: ASTNode): UnaryNode => ({ kind: "unary", op, operand });
export const call  = (fn: string, args: ASTNode[]): CallNode => ({ kind: "call", fn, args });
export const err   = (message: string, raw: string): ErrorNode => ({ kind: "error", message, raw });

export function freeVariables(node: ASTNode, knownFunctions: Set<string> = new Set()): Set<string> {
  const vars = new Set<string>();
  function walk(n: ASTNode) {
    switch (n.kind) {
      case "variable":
        if (!knownFunctions.has(n.name)) vars.add(n.name);
        break;
      case "binary":
        walk(n.left); walk(n.right);
        break;
      case "unary":
        walk(n.operand);
        break;
      case "call":
        n.args.forEach(walk);
        break;
      case "piecewise":
        n.branches.forEach(b => { walk(b.condition); walk(b.value); });
        if (n.otherwise) walk(n.otherwise);
        break;
    }
  }
  walk(node);
  return vars;
}
