---
{
  "id": "table",
  "label": "Value Table",
  "description": "Show a table of f(x) values at discrete sample points",
  "category": "utility",
  "appliesTo": ["function", "expression"],
  "inputs": [],
  "operation": {
    "type": "frontend",
    "op": "evaluate_table",
    "args": {}
  },
  "outputs": {
    "panel": [
      { "type": "table" }
    ]
  }
}
---

Evaluates the function at **x ∈ {−2, −1, 0, 1, 2}** using the frontend engine.
Works offline — no backend required. Updates live with sliders.
