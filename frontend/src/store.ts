import { create } from "zustand";
import { parse } from "./engine/parser";
import { ASTNode, ParsedExpression, freeVariables } from "./engine/ast";
import type { ProjectData } from "./project";
import { evaluate, Env, UserFns } from "./engine/evaluator";
import { buildUserFns } from "./engine/userfns";
import { defaultViewport, ViewportState } from "./renderer/viewport";
import { buildDependencyGraph, DependencyGraph } from "./engine/dependency";
import { TOOL_DEFINITIONS } from "./tools/loader";
import { runTool as execTool } from "./tools/runner";
import type { ToolResult, ToolInputValues, ToolContext } from "./tools/types";

export interface ExpressionEntry {
  id: string;
  raw: string;
  parsed: ParsedExpression;
  visible: boolean;
  color: string;
  error: string | null;
  showOutput: boolean;
  isGlobal: boolean;
}

export interface SliderEntry {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface AppState {
  expressions: ExpressionEntry[];
  sliders: SliderEntry[];
  viewport: ViewportState;
  depGraph: DependencyGraph;
  toolResults: Record<string, ToolResult>;
  expressionHistory: ExpressionEntry[][];

  addExpression: () => void;
  updateExpression: (id: string, raw: string) => void;
  removeExpression: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleOutput: (id: string) => void;
  toggleGlobal: (id: string) => void;
  setColor: (id: string, color: string) => void;
  undo: () => void;

  setSliderValue: (name: string, value: number) => void;
  setSliderRange: (name: string, min: number, max: number) => void;

  setViewport: (v: ViewportState) => void;
  loadProject: (data: ProjectData) => void;

  runTool: (toolId: string, inputs: ToolInputValues, exprId?: string) => Promise<void>;
  clearToolResult: (key: string) => void;

  getEnv: () => Env;
  getUserFns: () => UserFns;
  getListAssignments: () => Record<string, number[]>;
}

let nextId = 1;
const newId = () => String(nextId++);

const COLORS = [
  "#61acff", "#ff6b6b", "#6be08e", "#ffc935",
  "#cc73ff", "#38e0e0", "#ff8c33", "#ff74c8",
];
const colorFor = (i: number) => COLORS[i % COLORS.length];

const GRAPH_VARS = new Set(["x", "y", "t", "θ", "theta", "r"]);

function deriveSliders(expressions: ExpressionEntry[], existing: SliderEntry[]): SliderEntry[] {
  const defined = new Set<string>();
  const used    = new Set<string>();

  for (const e of expressions) {
    if (e.parsed.type === "function")   defined.add(e.parsed.name);
    if (e.parsed.type === "assignment") defined.add(e.parsed.name);
  }
  for (const e of expressions) {
    const p = e.parsed;
    if (p.type === "assignment") continue;
    const bodies =
      p.type === "function"   ? [p.body]        :
      p.type === "expression" ? [p.body]        :
      p.type === "equation"   ? [p.lhs, p.rhs]  :
      p.type === "inequality" ? [p.lhs, p.rhs]  : [];
    for (const body of bodies) {
      for (const v of freeVariables(body, defined)) {
        if (!GRAPH_VARS.has(v) && !defined.has(v)) used.add(v);
      }
    }
  }

  return [...used].map(name => existing.find(s => s.name === name) ?? { name, value: 1, min: -10, max: 10, step: 0.01 });
}

const CYCLE_ERROR = "circular reference";

// Build the dependency graph and reflect detected cycles back onto each
// expression's `error` so `f(x)=f(x)` / mutual recursion surfaces to the user
// instead of silently producing NaN (BUG-9). Clears stale cycle errors when a
// cycle is broken; never clobbers a parse error.
function rebuildDepState(expressions: ExpressionEntry[]) {
  const depGraph = buildDependencyGraph(
    expressions.map(e => ({ id: e.id, raw: e.raw, parsed: e.parsed })),
  );
  const annotated = expressions.map(e => {
    const inCycle = depGraph.cycles.has(e.id);
    if (inCycle && e.error == null) return { ...e, error: CYCLE_ERROR };
    if (!inCycle && e.error === CYCLE_ERROR) return { ...e, error: null };
    return e;
  });
  return { expressions: annotated, depGraph };
}

const MAX_HISTORY = 50;
function pushHistory(state: AppState): ExpressionEntry[][] {
  return [...state.expressionHistory.slice(-(MAX_HISTORY - 1)), state.expressions];
}

export const useStore = create<AppState>((set, get) => ({
  expressions: [],
  expressionHistory: [],
  sliders: [],
  viewport: defaultViewport(),
  depGraph: buildDependencyGraph([]),
  toolResults: {},

  addExpression: () => {
    const id    = newId();
    const index = get().expressions.length;
    const entry: ExpressionEntry = {
      id, raw: "", visible: true, color: colorFor(index),
      parsed: { type: "error", message: "empty", raw: "" },
      error: null, showOutput: false, isGlobal: false,
    };
    set(state => {
      const expressionHistory = pushHistory(state);
      const { expressions, depGraph } = rebuildDepState([...state.expressions, entry]);
      return { expressionHistory, expressions, depGraph };
    });
  },

  updateExpression: (id, raw) => {
    set(state => {
      const parsedExprs = state.expressions.map(e => {
        if (e.id !== id) return e;
        const parsed = parse(raw);
        return { ...e, raw, parsed, error: parsed.type === "error" ? parsed.message : null };
      });
      const sliders = deriveSliders(parsedExprs, state.sliders);
      const { expressions, depGraph } = rebuildDepState(parsedExprs);
      return { expressions, sliders, depGraph };
    });
  },

  removeExpression: (id) => {
    set(state => {
      const expressionHistory = pushHistory(state);
      const remaining   = state.expressions.filter(e => e.id !== id);
      const sliders     = deriveSliders(remaining, state.sliders);
      const toolResults = Object.fromEntries(
        Object.entries(state.toolResults).filter(([k]) => !k.endsWith(`:${id}`))
      );
      const { expressions, depGraph } = rebuildDepState(remaining);
      return { expressionHistory, expressions, sliders, depGraph, toolResults };
    });
  },

  toggleVisibility: (id) =>
    set(state => ({ expressions: state.expressions.map(e => e.id === id ? { ...e, visible: !e.visible } : e) })),

  toggleOutput: (id) =>
    set(state => ({ expressions: state.expressions.map(e => e.id === id ? { ...e, showOutput: !e.showOutput } : e) })),

  toggleGlobal: (id) =>
    set(state => ({ expressions: state.expressions.map(e => e.id === id ? { ...e, isGlobal: !e.isGlobal } : e) })),

  setColor: (id, color) =>
    set(state => ({ expressions: state.expressions.map(e => e.id === id ? { ...e, color } : e) })),

  undo: () => {
    set(state => {
      if (state.expressionHistory.length === 0) return state;
      const expressionHistory = state.expressionHistory.slice(0, -1);
      const prev = state.expressionHistory[state.expressionHistory.length - 1];
      const sliders = deriveSliders(prev, state.sliders);
      const { expressions, depGraph } = rebuildDepState(prev);
      return { expressionHistory, expressions, sliders, depGraph };
    });
  },

  setSliderValue: (name, value) =>
    set(state => ({ sliders: state.sliders.map(s => s.name === name ? { ...s, value } : s) })),

  setSliderRange: (name, min, max) =>
    set(state => ({ sliders: state.sliders.map(s => s.name === name ? { ...s, min, max } : s) })),

  setViewport: (viewport) => set({ viewport }),

  loadProject: (data) => {
    set(state => {
      const expressionHistory = pushHistory(state);
      const loaded: ExpressionEntry[] = data.expressions.map((e, i) => {
        const parsed = parse(e.raw);
        return {
          id: newId(),
          raw: e.raw,
          parsed,
          visible: e.visible ?? true,
          // Index the palette fallback so uncolored loaded expressions get
          // distinct colors instead of all collapsing to palette index 0 (BUG-11).
          color: e.color ?? colorFor(i),
          error: parsed.type === "error" ? parsed.message : null,
          showOutput: e.showOutput ?? false,
          isGlobal: e.isGlobal ?? false,
        };
      });
      // Derive slider identities from the loaded expressions, then overlay any
      // saved value/min/max/step so a saved `a=7` reloads as 7, not the default.
      const sliders = deriveSliders(loaded, []).map(s => {
        const saved = data.sliders.find(d => d.name === s.name);
        return saved ? { ...s, ...saved } : s;
      });
      const { expressions, depGraph } = rebuildDepState(loaded);
      return {
        expressionHistory,
        expressions,
        sliders,
        depGraph,
        toolResults: {},
        viewport: data.viewport,
      };
    });
  },

  runTool: async (toolId, inputs, exprId) => {
    const def = TOOL_DEFINITIONS.find(d => d.id === toolId);
    if (!def) return;

    const state = get();
    const ctx: ToolContext = {
      env:         state.getEnv(),
      userFns:     state.getUserFns(),
      viewport:    state.viewport,
      expressions: state.expressions,
      exprId,
    };

    const resultKey = `${toolId}:${exprId ?? "global"}`;
    const result    = await execTool(def, inputs, ctx);
    set(s => ({ toolResults: { ...s.toolResults, [resultKey]: result } }));
  },

  clearToolResult: (key) =>
    set(state => {
      const toolResults = { ...state.toolResults };
      delete toolResults[key];
      return { toolResults };
    }),

  getEnv: () => {
    const { expressions, sliders } = get();
    const env: Env = {};
    for (const s of sliders) env[s.name] = s.value;

    const userFns = buildUserFns(expressions, env);

    // Resolve scalar assignments so forward references (`b = a + 1` declared
    // above `a = 3`) settle regardless of document order. An explicit assignment
    // always wins over a same-named slider default (BUG-6).
    //
    // BP-7: order the assignments by their inter-assignment dependencies and
    // evaluate each exactly once, instead of the old O(passes × assignments)
    // fixpoint that re-evaluated every unresolved assignment on every pass. The
    // ordering loop is cheap set arithmetic; the win is that the *expensive*
    // `evaluate` call runs once per assignment, not once per pass. Cyclic /
    // unresolvable names are appended last and evaluated best-effort — preserving
    // the prior behaviour that a non-finite result is simply skipped.
    const byName = new Map<string, ASTNode>();
    for (const e of expressions) {
      if (e.parsed.type === "assignment" && !byName.has(e.parsed.name)) {
        byName.set(e.parsed.name, e.parsed.value);
      }
    }
    const knownFns = new Set(Object.keys(userFns));
    const deps = new Map<string, Set<string>>();
    for (const [name, value] of byName) {
      const refs = new Set<string>();
      for (const v of freeVariables(value, knownFns)) {
        if (v !== name && byName.has(v)) refs.add(v);
      }
      deps.set(name, refs);
    }
    // Kahn-style topological order: emit a name once all its assignment deps are
    // already emitted. When a full sweep makes no progress, the rest form a cycle
    // (or depend on one) — append them as-is for a best-effort single eval.
    const order: string[] = [];
    const remaining = new Set(byName.keys());
    let progress = true;
    while (remaining.size > 0 && progress) {
      progress = false;
      for (const name of [...remaining]) {
        if ([...deps.get(name)!].every(d => !remaining.has(d))) {
          order.push(name);
          remaining.delete(name);
          progress = true;
        }
      }
    }
    for (const name of remaining) order.push(name);

    for (const name of order) {
      const v = evaluate(byName.get(name)!, env, userFns);
      if (isFinite(v)) env[name] = v;
    }
    return env;
  },

  getUserFns: (): UserFns => {
    const state = get();
    return buildUserFns(state.expressions, state.getEnv());
  },

  getListAssignments: (): Record<string, number[]> => {
    const { expressions, getEnv } = get();
    const env = getEnv();
    const result: Record<string, number[]> = {};
    for (const e of expressions) {
      if (e.parsed.type !== "assignment") continue;
      const val = e.parsed.value;
      if (val.kind === "call" && val.fn === "list") {
        result[e.parsed.name] = val.args.map(a => evaluate(a, env));
      }
    }
    return result;
  },
}));
