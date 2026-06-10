---
{
  "id": "value_display",
  "label": "Value",
  "description": "Display the current computed value of an assignment",
  "category": "utility",
  "appliesTo": ["assignment"],
  "inputs": [],
  "operation": {
    "type": "frontend",
    "op": "evaluate_assignment",
    "args": {}
  },
  "outputs": {
    "panel": [
      { "type": "value", "label": "=", "value": "result.value", "precision": 6 }
    ]
  }
}
---

Shows the current numeric value of a scalar assignment such as `a = 3` or `k = 2π`.
Updates live when sliders or dependent variables change.
