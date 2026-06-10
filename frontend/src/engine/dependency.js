import { freeVariables } from "./ast";
export function buildDependencyGraph(entries) {
    const definitions = new Map();
    const deps = new Map();
    const dependents = new Map();
    const cycles = new Set();
    for (const entry of entries) {
        const p = entry.parsed;
        if (p.type === "function" || p.type === "assignment") {
            definitions.set(p.name, entry.id);
        }
    }
    const knownFunctions = new Set(definitions.keys());
    for (const entry of entries) {
        const p = entry.parsed;
        let freevars = new Set();
        switch (p.type) {
            case "function":
                freevars = freeVariables(p.body, new Set([...knownFunctions, ...p.params]));
                break;
            case "assignment":
                freevars = freeVariables(p.value, knownFunctions);
                break;
            case "equation":
                freevars = new Set([...freeVariables(p.lhs, knownFunctions), ...freeVariables(p.rhs, knownFunctions)]);
                break;
            case "inequality":
                freevars = new Set([...freeVariables(p.lhs, knownFunctions), ...freeVariables(p.rhs, knownFunctions)]);
                break;
            case "expression":
                freevars = freeVariables(p.body, knownFunctions);
                break;
        }
        deps.set(entry.id, freevars);
        for (const v of freevars) {
            if (!dependents.has(v))
                dependents.set(v, new Set());
            dependents.get(v).add(entry.id);
        }
    }
    function hasCycle(startId, visited = new Set()) {
        if (visited.has(startId))
            return true;
        visited.add(startId);
        const entryDeps = deps.get(startId) ?? new Set();
        for (const dep of entryDeps) {
            const defId = definitions.get(dep);
            if (defId && hasCycle(defId, new Set(visited)))
                return true;
        }
        return false;
    }
    for (const entry of entries) {
        if (hasCycle(entry.id))
            cycles.add(entry.id);
    }
    return { definitions, deps, dependents, cycles };
}
export function affectedBy(graph, changedName) {
    const affected = new Set();
    const queue = [...(graph.dependents.get(changedName) ?? [])];
    while (queue.length > 0) {
        const id = queue.pop();
        if (affected.has(id))
            continue;
        affected.add(id);
        const defName = [...graph.definitions.entries()].find(([, v]) => v === id)?.[0];
        if (defName) {
            for (const dep of graph.dependents.get(defName) ?? [])
                queue.push(dep);
        }
    }
    return affected;
}
