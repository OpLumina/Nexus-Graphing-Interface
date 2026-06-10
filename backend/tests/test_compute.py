import pytest
from fastapi import HTTPException
from compute import ComputeRequest, dispatch


def test_expr_501_chars_rejected():
    req = ComputeRequest(op="solve", inputs={"expr": "x" * 501})
    result = dispatch(req)
    assert result.ok is False
    assert "too long" in result.error.lower()


def test_expr_500_chars_passes_guard():
    req = ComputeRequest(op="simplify", inputs={"expr": "x" * 500})
    result = dispatch(req)
    # Guard passes — sympy may succeed or fail, but NOT for length
    assert "too long" not in result.error.lower()


def test_expr_empty_passes_guard():
    req = ComputeRequest(op="simplify", inputs={"expr": ""})
    result = dispatch(req)
    assert "too long" not in result.error.lower()


def test_unknown_op_raises_404():
    req = ComputeRequest(op="__nonexistent_op__", inputs={})
    with pytest.raises(HTTPException) as exc_info:
        dispatch(req)
    assert exc_info.value.status_code == 404


def test_known_op_returns_ok():
    req = ComputeRequest(op="simplify", inputs={"expr": "x + x"})
    result = dispatch(req)
    assert result.ok is True
    assert "2" in result.result.get("result", "")
