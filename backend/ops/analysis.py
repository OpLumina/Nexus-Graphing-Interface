import sympy as sp

from .parse_utils import parse_expr_safe as _parse


def _to_float_list(vals) -> list[float | str]:
    result = []
    for v in vals:
        try:
            result.append(float(v.evalf()))
        except Exception:
            result.append(str(v))
    return result


def analyze_function(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    var      = inputs.get("var", "x")

    expr, x = _parse(expr_str, var)
    d1      = sp.diff(expr, x)
    d2      = sp.diff(expr, x, 2)

    roots_raw    = sp.solve(expr, x)
    critical_raw = sp.solve(d1, x)
    inflect_raw  = sp.solve(d2, x)

    roots    = _to_float_list(roots_raw)
    critical = _to_float_list(critical_raw)
    inflect  = _to_float_list(inflect_raw)

    classified = []
    f2  = sp.lambdify(x, d2, modules=["numpy"])
    f_  = sp.lambdify(x, expr, modules=["numpy"])
    for cp in critical:
        try:
            cp_f   = float(cp)
            y_val  = float(f_(cp_f))
            d2_val = float(f2(cp_f))
            kind   = "min" if d2_val > 0 else "max" if d2_val < 0 else "saddle"
            classified.append({"x": cp_f, "y": y_val, "type": kind})
        except Exception:
            classified.append({"x": str(cp), "type": "unknown"})

    return {
        "roots":          roots,
        "critical_points": classified,
        "inflection_points": inflect,
        "derivative":     str(d1),
        "derivative_latex": sp.latex(d1),
        "second_derivative": str(d2),
        "second_derivative_latex": sp.latex(d2),
    }
