import numpy as np
import sympy as sp

from .parse_utils import parse_expr_safe as _parse


def sample(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    x_min    = float(inputs.get("x_min", -10))
    x_max    = float(inputs.get("x_max",  10))
    n        = max(2, min(int(inputs.get("n", 200)), 100_000))  # cap to bound cost (SEC-3)
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

    # Cap degree to bound cost and keep the fit well-posed (SEC-3).
    degree = max(1, min(degree, 12, len(xs) - 1))

    coeffs = np.polyfit(xs, ys, degree).tolist()
    poly   = np.poly1d(coeffs)
    y_pred = poly(xs)
    ss_res = float(np.sum((ys - y_pred) ** 2))
    ss_tot = float(np.sum((ys - np.mean(ys)) ** 2))
    # ss_tot == 0 means all y are equal; R² is undefined, not a perfect fit (BUG-8).
    # Emit JSON null (not NaN) so Starlette's allow_nan=True can't write the
    # bare `NaN` token that browsers reject in response.json().
    r2_val = 1 - ss_res / ss_tot if ss_tot != 0 else None
    if r2_val is not None and not np.isfinite(r2_val):
        r2_val = None

    return {
        "coefficients":  coeffs,
        "r_squared":     r2_val,
        "r_squared_defined": r2_val is not None,
        "equation":      str(np.poly1d(coeffs)),
    }
