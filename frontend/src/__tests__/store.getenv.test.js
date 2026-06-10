import { describe, it, expect, vi, beforeEach } from "vitest";
// Mock tools/loader before store import to prevent import.meta.glob and localStorage access
vi.mock("../tools/loader", () => ({
    TOOL_DEFINITIONS: [],
    getAllToolDefinitions: () => [],
    getToolDef: () => undefined,
    toolsForType: () => [],
}));
vi.mock("../tools/runner", () => ({
    runTool: async () => ({ ok: true, data: {}, overlays: [] }),
}));
import { useStore } from "../store";
beforeEach(() => {
    // Reset store to empty state before each test
    useStore.setState({
        expressions: [],
        sliders: [],
        expressionHistory: [],
        toolResults: {},
    });
});
describe("store.getEnv — assignment resolves through userFns", () => {
    it("a = f(2) with f(x)=x^2 resolves to 4", () => {
        const { addExpression, updateExpression, getEnv } = useStore.getState();
        addExpression();
        addExpression();
        const [id1, id2] = useStore.getState().expressions.map(e => e.id);
        updateExpression(id1, "f(x) = x^2");
        updateExpression(id2, "a = f(2)");
        const env = getEnv();
        expect(env.a).toBe(4);
    });
    it("a = f(2) with f(x)=2*x resolves to 4", () => {
        const { addExpression, updateExpression, getEnv } = useStore.getState();
        addExpression();
        addExpression();
        const [id1, id2] = useStore.getState().expressions.map(e => e.id);
        updateExpression(id1, "f(x) = 2*x");
        updateExpression(id2, "a = f(2)");
        const env = getEnv();
        expect(env.a).toBe(4);
    });
    it("getEnv does not include function names as scalars", () => {
        const { addExpression, updateExpression, getEnv } = useStore.getState();
        addExpression();
        const [id] = useStore.getState().expressions.map(e => e.id);
        updateExpression(id, "f(x) = x + 1");
        const env = getEnv();
        expect(env["f"]).toBeUndefined();
    });
    it("slider values appear in env", () => {
        useStore.setState({
            sliders: [{ name: "k", value: 7, min: -10, max: 10, step: 0.1 }],
        });
        const env = useStore.getState().getEnv();
        expect(env.k).toBe(7);
    });
});
