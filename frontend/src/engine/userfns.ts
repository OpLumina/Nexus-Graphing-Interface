import { evaluate, Env, UserFns } from "./evaluator";
import type { ParsedExpression } from "./ast";

// Single source for building the user-function map so getEnv/getUserFns can't
// drift (ARCH-1). Each fn closes over `env`, which may be mutated in place by
// the caller (store.getEnv) as assignments resolve — the closure sees the final
// values.
//
// Lives in the pure engine (not the store) so the plugin sandbox Worker can
// rebuild an identical userFns map from a structured-cloned list of parsed
// expressions, without importing the store/React (SEC-1). Takes a structural
// subset of ExpressionEntry — only `parsed` is needed.
export function buildUserFns(
  expressions: { parsed: ParsedExpression }[],
  env: Env,
): UserFns {
  const userFns: UserFns = {};
  for (const e of expressions) {
    if (e.parsed.type !== "function") continue;
    const { name, params, body } = e.parsed;
    userFns[name] = (args) => {
      const callEnv = { ...env };
      params.forEach((p, i) => { callEnv[p] = args[i] ?? NaN; });
      return evaluate(body, callEnv, userFns);
    };
  }
  return userFns;
}
