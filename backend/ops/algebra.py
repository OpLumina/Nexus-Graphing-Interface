import sympy as sp
from .parse_utils import parse_expr_safe as _parse


def _sym(result) -> dict:
    return {"result": str(result), "latex": sp.latex(result)}


def solve(inputs: dict) -> dict:
    expr, x = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    roots   = sp.solve(expr, x)
    return {"result": str(roots), "latex": sp.latex(roots), "values": [str(r) for r in roots]}


def factor(inputs: dict) -> dict:
    expr, _ = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    return _sym(sp.factor(expr))


def expand(inputs: dict) -> dict:
    expr, _ = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    return _sym(sp.expand(expr))


def simplify(inputs: dict) -> dict:
    expr, _ = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    return _sym(sp.simplify(expr))


def integral(inputs: dict) -> dict:
    expr, x = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    return _sym(sp.integrate(expr, x))


def limit(inputs: dict) -> dict:
    expr, x = _parse(inputs.get("expr", ""), inputs.get("var", "x"))
    point     = float(inputs.get("point", 0))
    direction = inputs.get("direction", "+")
    return _sym(sp.limit(expr, x, point, direction))
