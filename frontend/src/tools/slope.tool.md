---
{
  "id": "slope",
  "label": "Slope at Point",
  "description": "Compute the derivative f'(x) at a given x value and draw the tangent line",
  "category": "calculus",
  "appliesTo": ["function", "expression"],
  "inputs": [
    { "name": "x", "type": "number", "label": "x =", "default": 0 }
  ],
  "operation": {
    "type": "backend",
    "op": "numeric_derivative",
    "args": {
      "expr": "ctx.expr",
      "x": "inputs.x"
    }
  },
  "outputs": {
    "overlays": [
      {
        "type": "line",
        "x0": "inputs.x",
        "y0": "result.y",
        "slope": "result.slope",
        "color": "ctx.color"
      }
    ],
    "panel": [
      { "type": "value", "label": "slope", "value": "result.slope", "precision": 6 },
      { "type": "value", "label": "y",     "value": "result.y",     "precision": 6 }
    ]
  }
}
---

Computes **f'(x)** via central differences on the backend and draws the tangent line on the graph.
The slope and y-value at the given point are shown in the panel.
