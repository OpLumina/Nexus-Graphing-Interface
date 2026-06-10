import sympy as sp
import numpy as np
from .parse_utils import parse_expr_safe as _parse


def numeric_derivative(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    x_val    = float(inputs.get("x", 0))
    var      = inputs.get("var", "x")

    expr, x = _parse(expr_str, var)
    f = sp.lambdify(x, expr, modules=["numpy"])

    h = 1e-7
    y     = float(f(x_val))
    slope = float((f(x_val + h) - f(x_val - h)) / (2 * h))

    return {"slope": slope, "y": y}


def taylor_series(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    var      = inputs.get("var", "x")
    a        = inputs.get("a", 0)
    n        = int(inputs.get("n", 5))

    expr, x = _parse(expr_str, var)
    series  = sp.series(expr, x, a, n + 1).removeO()

    return {
        "result": str(series),
        "latex":  sp.latex(series),
        "order":  n,
        "around": a,
    }


def definite_integral(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    var      = inputs.get("var", "x")
    a        = float(inputs.get("a", 0))
    b        = float(inputs.get("b", 1))

    expr, x  = _parse(expr_str, var)
    indef    = sp.integrate(expr, x)
    symbolic = sp.integrate(expr, (x, a, b))

    try:
        numeric = float(symbolic.evalf())
    except Exception:
        from scipy import integrate as sci_int
        f = sp.lambdify(x, expr, modules=["numpy"])
        numeric, _ = sci_int.quad(f, a, b)

    return {
        "result":      str(symbolic),
        "latex":       sp.latex(symbolic),
        "value":       numeric,
        "antiderivative": str(indef),
        "antiderivative_latex": sp.latex(indef),
        "a": a,
        "b": b,
    }


def symbolic_derivative(inputs: dict) -> dict:
    expr_str = inputs.get("expr", "")
    var      = inputs.get("var", "x")
    order    = int(inputs.get("order", 1))

    expr, x = _parse(expr_str, var)
    deriv   = sp.diff(expr, x, order)

    return {"result": str(deriv), "latex": sp.latex(deriv)}
