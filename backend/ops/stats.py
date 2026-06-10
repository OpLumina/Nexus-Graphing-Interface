import numpy as np
import sympy as sp
from .parse_utils import parse_expr_safe as _parse


def sample(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    x_min    = float(inputs.get("x_min", -10))
    x_max    = float(inputs.get("x_max",  10))
    n        = int(inputs.get("n", 200))
    var      = inputs.get("var", "x")

    expr, x = _parse(expr_str, var)
    f       = sp.lambdify(x, expr, modules=["numpy"])
    xs      = np.linspace(x_min, x_max, n)

    try:
        ys = np.array(f(xs), dtype=float)
    except Exception:
        ys = np.array([float(f(xi)) for xi in xs])

    mask = np.isfinite(ys)
    return {
        "x": xs[mask].tolist(),
        "y": ys[mask].tolist(),
    }


def regression(inputs: dict) -> dict:
    xs     = np.array(inputs.get("x", []), dtype=float)
    ys     = np.array(inputs.get("y", []), dtype=float)
    degree = int(inputs.get("degree", 1))

    if len(xs) < 2 or len(xs) != len(ys):
        return {"error": "Need at least 2 matching x/y points"}

    coeffs = np.polyfit(xs, ys, degree).tolist()
    poly   = np.poly1d(coeffs)
    y_pred = poly(xs)
    ss_res = float(np.sum((ys - y_pred) ** 2))
    ss_tot = float(np.sum((ys - np.mean(ys)) ** 2))
    r2     = 1 - ss_res / ss_tot if ss_tot != 0 else 1.0

    return {
        "coefficients": coeffs,
        "r_squared":    r2,
        "equation":     str(np.poly1d(coeffs)),
    }
