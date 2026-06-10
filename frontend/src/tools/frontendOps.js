import { evaluate } from "../engine/evaluator";
function buildEvalAt(ctx) {
    const expr = ctx.expressions.find(e => e.id === ctx.exprId);
    if (!expr)
        return null;
    if (expr.parsed.type === "function" && expr.parsed.params.length === 1) {
        const { body, params } = expr.parsed;
        return (xv) => evaluate(body, { ...ctx.env, [params[0]]: xv }, ctx.userFns);
    }
    if (expr.parsed.type === "expression") {
        const { body } = expr.parsed;
        return (xv) => evaluate(body, { ...ctx.env, x: xv }, ctx.userFns);
    }
    return null;
}
export const FRONTEND_OPS = {
    evaluate_table: (_args, ctx) => {
        const evalAt = buildEvalAt(ctx);
        if (!evalAt)
            return { rows: [] };
        const xs = [-2, -1, 0, 1, 2];
        const rows = xs.map(x => ({ x, y: evalAt(x) }));
        return { rows };
    },
    evaluate_assignment: (_args, ctx) => {
        const expr = ctx.expressions.find(e => e.id === ctx.exprId);
        if (!expr || expr.parsed.type !== "assignment")
            return { value: NaN };
        const value = evaluate(expr.parsed.value, ctx.env, ctx.userFns);
        return { value };
    },
};
