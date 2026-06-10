---
{
  "id": "taylor",
  "label": "Taylor Series",
  "description": "Expand a function as a Taylor/Maclaurin series around a point",
  "category": "calculus",
  "appliesTo": ["function", "expression"],
  "inputs": [
    { "name": "a", "type": "number", "label": "around", "default": 0 },
    { "name": "n", "type": "number", "label": "order",  "default": 5 }
  ],
  "operation": {
    "type": "backend",
    "op": "taylor_series",
    "args": {
      "expr": "ctx.expr",
      "a":    "inputs.a",
      "n":    "inputs.n"
    }
  },
  "outputs": {
    "panel": [
      { "type": "latex", "value": "result.latex", "displayMode": true }
    ]
  }
}
---

## Taylor Series

Expands **f(x)** as a polynomial around a point **a**:

$$f(x) = \sum_{n=0}^{N} \frac{f^{(n)}(a)}{n!}(x-a)^n + O\!\left((x-a)^{N+1}\right)$$

When **a = 0** this is a **Maclaurin series**. The expansion is computed symbolically using SymPy and rendered as LaTeX.
