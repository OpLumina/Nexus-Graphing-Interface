---
{
  "id": "sym_derivative",
  "label": "Derivative",
  "description": "Compute the symbolic derivative f'(x) using SymPy",
  "category": "calculus",
  "appliesTo": ["function", "expression"],
  "inputs": [
    { "name": "order", "type": "number", "label": "order", "default": 1 }
  ],
  "operation": {
    "type": "backend",
    "op": "symbolic_derivative",
    "args": {
      "expr":  "ctx.expr",
      "order": "inputs.order"
    }
  },
  "outputs": {
    "panel": [
      { "type": "latex", "value": "result.latex", "displayMode": true }
    ]
  }
}
---

## Symbolic Derivative

Differentiates **f(x)** symbolically. The **order** field controls the derivative order:
- Order 1 → f′(x)
- Order 2 → f″(x)

Results are returned as fully simplified LaTeX expressions.
