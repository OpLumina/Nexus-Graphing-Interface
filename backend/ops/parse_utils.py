import math
import re

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

_TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

# A numeric power-tower of height >= 3 (e.g. `9^9^9^9`) can evaluate to an
# astronomical integer at parse time and peg CPU/memory despite being short
# (SEC-3). But many height-3 towers are perfectly finite (`2^3^2` = 512), so a
# blanket regex reject is over-broad (BUG-13). Instead we locate numeric towers
# and reject only when the result's magnitude would exceed ~10**MAX_TOWER_LOG10.

# Base followed by >= 2 chained numeric exponents (^ or **).
_TOWER_RUN = re.compile(r"\d[\d.]*(?:\s*(?:\^|\*\*)\s*\d[\d.]*){2,}")
_TOWER_NUM = re.compile(r"\d[\d.]*")

# Allow results up to 10**100; reject anything provably larger.
_MAX_TOWER_LOG10 = 100.0
# Once the stacked exponent exceeds this and another base >= 2 remains, the
# tower is unquestionably astronomical — short-circuit instead of computing it.
_EXP_CUTOFF = 64.0


def _tower_too_big(nums: list[float]) -> bool:
    """nums = [n0, n1, ...] for n0 ** (n1 ** (n2 ** ...)). True if too large."""
    # Fold the exponent stacked above the base, top-down, with a hard cutoff so
    # we never materialize the explosive value we're trying to reject.
    exp = nums[-1]
    for n in reversed(nums[1:-1]):
        if n <= 1:
            exp = 1.0 if n == 1 else 0.0
            continue
        if n >= 2 and exp > _EXP_CUTOFF:
            return True
        try:
            exp = n ** exp
        except OverflowError:
            return True
        if not math.isfinite(exp):
            return True
    base = nums[0]
    if base <= 1:
        return False
    try:
        return exp * math.log10(base) > _MAX_TOWER_LOG10
    except (ValueError, OverflowError):
        return True


def _has_dangerous_power_tower(expr_str: str) -> bool:
    for m in _TOWER_RUN.finditer(expr_str):
        nums = [float(x) for x in _TOWER_NUM.findall(m.group())]
        if len(nums) >= 3 and _tower_too_big(nums):
            return True
    return False

# Built once: the SymPy namespace the parser resolves names against. Python
# builtins are restricted to a minimal math-safe whitelist rather than emptied
# entirely: an empty `__builtins__` makes `parse_expr` raise on inputs that
# legitimately resolve through a builtin (e.g. `abs(x)`, `min`/`max`) during
# sympify (BUG-14), while the whitelist still withholds every escape primitive
# (`__import__`, `eval`, `exec`, `open`, `getattr`, ...) the SEC-4 hardening
# guards against. Rebuilding per-call via `from sympy import *` would be wasteful.
import builtins as _builtins  # noqa: E402 — placed beside its whitelist rationale (BUG-14), not a stray import

_SAFE_BUILTIN_NAMES = (
    "abs", "min", "max", "round", "pow", "divmod", "sum",
    "int", "float", "complex", "bool", "range",
    "True", "False", "None",
)
_SAFE_BUILTINS = {
    name: getattr(_builtins, name)
    for name in _SAFE_BUILTIN_NAMES
    if hasattr(_builtins, name)
}

_GLOBAL_DICT: dict = {}
exec("from sympy import *", _GLOBAL_DICT)  # noqa: S102 - trusted literal
_GLOBAL_DICT["__builtins__"] = _SAFE_BUILTINS


def parse_expr_safe(expr_str: str, var: str = "x") -> tuple[sp.Expr, sp.Symbol]:
    if _has_dangerous_power_tower(expr_str):
        raise ValueError("Numeric power tower result is too large")

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
        global_dict=_GLOBAL_DICT,
        transformations=_TRANSFORMATIONS,
    )
    return expr, x
