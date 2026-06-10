import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)

_TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)


def parse_expr_safe(expr_str: str, var: str = "x") -> tuple[sp.Expr, sp.Symbol]:
    x = sp.Symbol(var)
    local_dict = {
        var: x,
        "pi": sp.pi,
        "e": sp.E,
        "inf": sp.oo,
        "arcsin": sp.asin, "arccos": sp.acos, "arctan": sp.atan,
        "ln": sp.log,
    }
    expr = parse_expr(
        expr_str,
        local_dict=local_dict,
        transformations=_TRANSFORMATIONS,
    )
    return expr, x
