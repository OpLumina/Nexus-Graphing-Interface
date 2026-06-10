---
{
  "id": "definite_integral",
  "label": "Definite Integral",
  "description": "Compute ∫ₐᵇ f(x) dx symbolically and numerically",
  "category": "calculus",
  "appliesTo": ["function", "expression"],
  "inputs": [
    { "name": "a", "type": "number", "label": "from", "default": 0 },
    { "name": "b", "type": "number", "label": "to",   "default": 1 }
  ],
  "operation": {
    "type": "backend",
    "op": "definite_integral",
    "args": {
      "expr": "ctx.expr",
      "a":    "inputs.a",
      "b":    "inputs.b"
    }
  },
  "outputs": {
    "panel": [
      { "type": "latex", "label": "exact",   "value": "result.latex",            "displayMode": true },
      { "type": "value", "label": "≈",       "value": "result.value",            "precision": 8 },
      { "type": "latex", "label": "∫f dx =", "value": "result.antiderivative_latex" }
    ]
  }
}
---

## Definite Integral

Computes the signed area under the curve from **a** to **b**:

$$\int_a^b f(x)\, dx = F(b) - F(a)$$

The exact result is computed symbolically by SymPy. If the antiderivative cannot be expressed in closed form, scipy.integrate.quad provides a high-precision numerical fallback.
