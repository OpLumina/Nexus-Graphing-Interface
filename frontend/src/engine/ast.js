export const num = (value) => ({ kind: "number", value });
export const vari = (name) => ({ kind: "variable", name });
export const cnst = (name) => ({ kind: "constant", name });
export const binop = (op, left, right) => ({ kind: "binary", op, left, right });
export const unary = (op, operand) => ({ kind: "unary", op, operand });
export const call = (fn, args) => ({ kind: "call", fn, args });
export const err = (message, raw) => ({ kind: "error", message, raw });
export function freeVariables(node, knownFunctions = new Set()) {
    const vars = new Set();
    function walk(n) {
        switch (n.kind) {
            case "variable":
                if (!knownFunctions.has(n.name))
                    vars.add(n.name);
                break;
            case "binary":
                walk(n.left);
                walk(n.right);
                break;
            case "unary":
                walk(n.operand);
                break;
            case "call":
                n.args.forEach(walk);
                break;
            case "piecewise":
                n.branches.forEach(b => { walk(b.condition); walk(b.value); });
                if (n.otherwise)
                    walk(n.otherwise);
                break;
        }
    }
    walk(node);
    return vars;
}
