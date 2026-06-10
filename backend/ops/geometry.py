import numpy as np
import sympy as sp
from scipy import optimize
from .parse_utils import parse_expr_safe as _parse


def reflect_vector(inputs: dict) -> dict:
    expr1_str = inputs.get("expr1", "")
    expr2_str = inputs.get("expr2", "")
    x_min     = float(inputs.get("x_min", -10))
    x_max     = float(inputs.get("x_max",  10))
    var       = inputs.get("var", "x")

    e1, x = _parse(expr1_str, var)
    e2, _ = _parse(expr2_str, var)

    d1 = sp.diff(e1, x)
    d2 = sp.diff(e2, x)

    dd1 = sp.diff(d1, x)
    dd2 = sp.diff(d2, x)
    linear1 = sp.simplify(dd1) == 0
    linear2 = sp.simplify(dd2) == 0
    both_nonlinear = not linear1 and not linear2

    diff_fn = sp.lambdify(x, e1 - e2, modules=["numpy"])
    e1_fn   = sp.lambdify(x, e1,      modules=["numpy"])
    d1_fn   = sp.lambdify(x, d1,      modules=["numpy"])
    d2_fn   = sp.lambdify(x, d2,      modules=["numpy"])

    xs = np.linspace(x_min, x_max, 2000)
    try:
        ys = diff_fn(xs).astype(float)
    except Exception:
        return {"intersections": [], "both_nonlinear": both_nonlinear, "lines": []}

    sign_changes = np.where(np.diff(np.sign(ys)))[0]

    TANGENT_COLOR = "rgba(255,255,255,0.4)"
    REFLECT_COLOR = "#ffc935"

    intersections = []
    overlay_lines = []
    seen: list[float] = []

    for idx in sign_changes:
        try:
            x0 = float(optimize.brentq(diff_fn, float(xs[idx]), float(xs[idx + 1])))
        except Exception:
            continue
        if any(abs(x0 - s) < 1e-6 for s in seen):
            continue
        seen.append(x0)

        try:
            y0 = float(e1_fn(x0))
            m1 = float(d1_fn(x0))
            m2 = float(d2_fn(x0))
        except Exception:
            continue

        theta1  = float(np.arctan(m1))
        theta2  = float(np.arctan(m2))
        theta_r = 2.0 * theta2 - theta1
        reflect_slope = float(np.tan(theta_r)) if not both_nonlinear else None

        intersections.append({
            "x": x0, "y": y0,
            "slope1": m1, "slope2": m2,
            "reflect_slope": reflect_slope,
            "description": f"({x0:.4f}, {y0:.4f})",
        })

        overlay_lines.append({"x0": x0, "y0": y0, "slope": m1, "color": TANGENT_COLOR})
        overlay_lines.append({"x0": x0, "y0": y0, "slope": m2, "color": TANGENT_COLOR})
        if reflect_slope is not None:
            overlay_lines.append({"x0": x0, "y0": y0, "slope": reflect_slope, "color": REFLECT_COLOR})

    return {
        "intersections":  intersections,
        "both_nonlinear": both_nonlinear,
        "lines":          overlay_lines,
    }
