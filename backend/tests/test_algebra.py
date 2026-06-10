import pytest
from ops.algebra import limit, solve, simplify


def test_limit_string_point_no_typeerror():
    """float() coercion on string point must not raise TypeError."""
    result = limit({"expr": "x", "var": "x", "point": "0", "direction": "+"})
    assert float(result["result"]) == pytest.approx(0.0)


def test_limit_string_point_nonzero():
    result = limit({"expr": "x^2", "var": "x", "point": "2"})
    assert float(result["result"]) == pytest.approx(4.0)


def test_limit_int_point():
    result = limit({"expr": "x^2", "var": "x", "point": 3})
    assert float(result["result"]) == pytest.approx(9.0)


def test_limit_float_point():
    result = limit({"expr": "x", "var": "x", "point": 1.5})
    assert float(result["result"]) == pytest.approx(1.5)


def test_limit_default_point_zero():
    result = limit({"expr": "x^2", "var": "x"})
    assert result["result"] == "0"


def test_limit_infinity_direction():
    result = limit({"expr": "1/x", "var": "x", "point": "0", "direction": "+"})
    assert "oo" in result["result"]


def test_simplify_basic():
    result = simplify({"expr": "x + x", "var": "x"})
    assert "2" in result["result"]


def test_solve_basic():
    result = solve({"expr": "x - 3", "var": "x"})
    assert "3" in result["result"]
