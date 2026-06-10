import { create } from "zustand";
import { parse } from "./engine/parser";
import { ParsedExpression, freeVariables } from "./engine/ast";
import { evaluate, Env, UserFns } from "./engine/evaluator";
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
    if (e.parsed.type === "assignment") continue;
    const body =
      e.parsed.type === "function"   ? e.parsed.body :
      e.parsed.type === "expression" ? e.parsed.body :
      e.parsed.type === "equation"   ? e.parsed.lhs  : null;
    if (!body) continue;
    for (const v of freeVariables(body, defined)) {
      if (!GRAPH_VARS.has(v) && !defined.has(v)) used.add(v);
    }
  }

  return [...used].map(name => existing.find(s => s.name === name) ?? { name, value: 1, min: -10, max: 10, step: 0.01 });
}

function rebuildDepGraph(expressions: ExpressionEntry[]) {
  return buildDependencyGraph(expressions.map(e => ({ id: e.id, raw: e.raw, parsed: e.parsed })));
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
      const expressions = [...state.expressions, entry];
      return { expressionHistory, expressions, depGraph: rebuildDepGraph(expressions) };
    });
  },

  updateExpression: (id, raw) => {
    set(state => {
      const expressions = state.expressions.map(e => {
        if (e.id !== id) return e;
        const parsed = parse(raw);
        return { ...e, raw, parsed, error: parsed.type === "error" ? parsed.message : null };
      });
      const sliders = deriveSliders(expressions, state.sliders);
      return { expressions, sliders, depGraph: rebuildDepGraph(expressions) };
    });
  },

  removeExpression: (id) => {
    set(state => {
      const expressionHistory = pushHistory(state);
      const expressions = state.expressions.filter(e => e.id !== id);
      const sliders     = deriveSliders(expressions, state.sliders);
      const toolResults = Object.fromEntries(
        Object.entries(state.toolResults).filter(([k]) => !k.endsWith(`:${id}`))
      );
      return { expressionHistory, expressions, sliders, depGraph: rebuildDepGraph(expressions), toolResults };
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
      const expressions = state.expressionHistory[state.expressionHistory.length - 1];
      const sliders = deriveSliders(expressions, state.sliders);
      return { expressionHistory, expressions, sliders, depGraph: rebuildDepGraph(expressions) };
    });
  },

  setSliderValue: (name, value) =>
    set(state => ({ sliders: state.sliders.map(s => s.name === name ? { ...s, value } : s) })),

  setSliderRange: (name, min, max) =>
    set(state => ({ sliders: state.sliders.map(s => s.name === name ? { ...s, min, max } : s) })),

  setViewport: (viewport) => set({ viewport }),

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

    for (const e of expressions) {
      if (e.parsed.type === "assignment") {
        const v = evaluate(e.parsed.value, env, userFns);
        if (isFinite(v)) env[e.parsed.name] = v;
      }
    }
    return env;
  },

  getUserFns: (): UserFns => {
    const state    = get();
    const env      = state.getEnv();
    const userFns: UserFns = {};
    for (const e of state.expressions) {
      if (e.parsed.type !== "function") continue;
      const { name, params, body } = e.parsed;
      userFns[name] = (args) => {
        const callEnv = { ...env };
        params.forEach((p, i) => { callEnv[p] = args[i] ?? NaN; });
        return evaluate(body, callEnv, userFns);
      };
    }
    return userFns;
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
