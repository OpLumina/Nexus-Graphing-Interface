import { compute } from "../api/calls";
import { FRONTEND_OPS } from "./frontendOps";
import { runSandboxed } from "../plugins/sandbox";
function resolve(path, scope) {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur = scope;
    for (const p of parts) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
function buildOverlays(def, scope, rawResult) {
    const specs = def.outputs.overlays ?? [];
    return specs.flatMap((spec) => {
        if (spec.type === "line") {
            const x0 = resolve(spec.x0 ?? "", scope);
            const y0 = resolve(spec.y0 ?? "", scope);
            const slope = resolve(spec.slope ?? "", scope);
            const color = resolve(spec.color ?? "", scope) ?? "#ffffff";
            if (!isFinite(x0) || !isFinite(y0) || !isFinite(slope))
                return [];
            return [{ x0, y0, slope, color }];
        }
        if (spec.type === "lines_from_result") {
            return rawResult.lines ?? [];
        }
        return [];
    });
}
export async function runTool(def, inputs, toolCtx) {
    const expr = toolCtx.exprId
        ? (() => {
            const e = toolCtx.expressions.find(ex => ex.id === toolCtx.exprId);
            if (!e)
                return "";
            const eqIdx = e.raw.indexOf("=");
            return eqIdx >= 0 ? e.raw.slice(eqIdx + 1).trim() : e.raw.trim();
        })()
        : "";
    const exprEntry = toolCtx.expressions.find(e => e.id === toolCtx.exprId);
    const parsedExpr = exprEntry?.parsed;
    const expr1 = parsedExpr?.type === "reflect" ? parsedExpr.expr1 : undefined;
    const expr2 = parsedExpr?.type === "reflect" ? parsedExpr.expr2 : undefined;
    const resolveExprBody = (name) => {
        if (!name)
            return "";
        const fn = toolCtx.expressions.find(e => e.parsed.type === "function" && e.parsed.name === name);
        if (!fn)
            return name;
        const eq = fn.raw.indexOf("=");
        return eq >= 0 ? fn.raw.slice(eq + 1).trim() : fn.raw.trim();
    };
    const scope = {
        inputs,
        result: {},
        ctx: {
            expr,
            expr1: expr1 ? resolveExprBody(expr1) : undefined,
            expr2: expr2 ? resolveExprBody(expr2) : undefined,
            color: exprEntry?.color ?? "#ffffff",
            exprId: toolCtx.exprId,
            viewport: toolCtx.viewport,
        },
    };
    let rawResult = {};
    try {
        if (def.operation.type === "frontend") {
            const opFn = FRONTEND_OPS[def.operation.op];
            if (!opFn)
                throw new Error(`Unknown frontend op: ${def.operation.op}`);
            rawResult = opFn(inputs, toolCtx);
        }
        else if (def.operation.type === "inline") {
            const result = await runSandboxed(def.operation.js, inputs, toolCtx);
            if (!result.ok)
                return result;
            return result;
        }
        else {
            const resolvedArgs = {};
            for (const [k, pathOrVal] of Object.entries(def.operation.args ?? {})) {
                resolvedArgs[k] = typeof pathOrVal === "string" && pathOrVal.includes(".")
                    ? resolve(pathOrVal, scope)
                    : pathOrVal;
            }
            const res = await compute(def.operation.op, resolvedArgs);
            if (!res.ok)
                return { ok: false, error: res.error, data: {} };
            rawResult = res.result;
        }
    }
    catch (err) {
        return { ok: false, error: String(err), data: {} };
    }
    scope.result = rawResult;
    const overlays = buildOverlays(def, scope, rawResult);
    return { ok: true, data: rawResult, overlays };
}
