---
{
  "id": "reflect",
  "label": "Reflection Vector",
  "description": "Find intersections of two curves and compute the reflection direction vector",
  "category": "geometry",
  "appliesTo": ["reflect"],
  "inputs": [],
  "operation": {
    "type": "backend",
    "op": "reflect_vector",
    "args": {
      "expr1":  "ctx.expr1",
      "expr2":  "ctx.expr2",
      "x_min":  "ctx.viewport.xMin",
      "x_max":  "ctx.viewport.xMax"
    }
  },
  "outputs": {
    "overlays": [
      { "type": "lines_from_result" }
    ],
    "panel": [
      { "type": "intersections" }
    ]
  }
}
---

Type `reflect(f, g)` to use this tool. It:

1. Finds all intersection points of **f** and **g** within the current viewport
2. Computes the tangent slope of each function at the intersection
3. Derives the reflected direction using **θ_reflect = 2θ_mirror − θ_incident**
4. Draws the tangent lines (faint) and the reflected ray (gold) on the graph

If both functions are curved, tangent lines are shown for reference.
