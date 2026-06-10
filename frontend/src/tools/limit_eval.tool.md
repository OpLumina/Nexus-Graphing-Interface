---
{
  "id": "limit_eval",
  "label": "Limit",
  "description": "Evaluate the limit of f(x) as x approaches a point",
  "category": "calculus",
  "appliesTo": ["function", "expression"],
  "inputs": [
    { "name": "point",     "type": "number", "label": "x →",     "default": 0 },
    { "name": "direction", "type": "string", "label": "side",    "default": "+" }
  ],
  "operation": {
    "type": "backend",
    "op": "limit",
    "args": {
      "expr":      "ctx.expr",
      "point":     "inputs.point",
      "direction": "inputs.direction"
    }
  },
  "outputs": {
    "panel": [
      { "type": "latex", "value": "result.latex", "displayMode": true }
    ]
  }
}
---

## Limit Evaluator

Computes **lim_{x → point} f(x)** symbolically.

**Direction:** use `+` for right-hand limit, `-` for left-hand, or `±` for two-sided.

Handles indeterminate forms (0/0, ∞/∞) via L'Hôpital's rule internally.
