---
{
  "id": "analyze",
  "label": "Analysis",
  "description": "Find roots, critical points, inflection points, and domain of a function",
  "category": "analysis",
  "appliesTo": ["function", "expression"],
  "inputs": [],
  "operation": {
    "type": "backend",
    "op": "analyze_function",
    "args": {
      "expr":  "ctx.expr",
      "x_min": "ctx.viewport.xMin",
      "x_max": "ctx.viewport.xMax"
    }
  },
  "outputs": {
    "panel": [
      { "type": "value", "label": "roots",             "value": "result.roots" },
      { "type": "value", "label": "critical points",   "value": "result.critical_points" },
      { "type": "value", "label": "inflection points", "value": "result.inflection_points" },
      { "type": "value", "label": "domain",            "value": "result.domain" }
    ]
  }
}
---

Performs symbolic analysis on the function using **SymPy** on the backend:

- **Roots** — solves f(x) = 0 within the current viewport
- **Critical points** — solves f'(x) = 0
- **Inflection points** — solves f''(x) = 0
- **Domain** — computes the continuous domain symbolically
