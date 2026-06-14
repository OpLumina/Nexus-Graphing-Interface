import os
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from concurrent.futures.process import BrokenProcessPool

from fastapi import HTTPException
from pydantic import BaseModel

from ops import OPS


class ComputeRequest(BaseModel):
    op:     str
    inputs: dict = {}


class ComputeResponse(BaseModel):
    ok:     bool
    result: dict = {}
    error:  str  = ""


MAX_STR_LEN = 500

# ARCH-4: run each op in a separate worker process with a hard wall-clock timeout
# so a single pathological request cannot peg the API thread indefinitely. The
# SEC-3 magnitude caps already bound the worst case; this adds true isolation —
# on timeout the worker is *killed* (a thread can't be), freeing the request path.
# A pool of one long-lived worker is reused across requests (the desktop app is
# single-user, effectively serial), so the sympy-import cost is paid once, not
# per call. Tunable via NEXUS_COMPUTE_TIMEOUT (seconds); 0/negative disables the
# isolation entirely and runs inline (the documented pre-ARCH-4 behaviour).
try:
    COMPUTE_TIMEOUT_S = float(os.environ.get("NEXUS_COMPUTE_TIMEOUT", "10"))
except ValueError:
    COMPUTE_TIMEOUT_S = 10.0

_pool: ProcessPoolExecutor | None = None


def _get_pool() -> ProcessPoolExecutor:
    global _pool
    if _pool is None:
        _pool = ProcessPoolExecutor(max_workers=1)
    return _pool


def _kill_pool() -> None:
    # Tear down the worker (killing any in-flight runaway op) so the next request
    # lazily spins a fresh one. cancel_futures clears anything still queued.
    global _pool
    if _pool is not None:
        _pool.shutdown(wait=False, cancel_futures=True)
        _pool = None


def _run_op(op: str, inputs: dict) -> dict:
    # Executed in the worker process. OPS values are module-level functions and
    # inputs/results are JSON-serializable (they already cross the HTTP boundary),
    # so both pickle cleanly across the process boundary.
    return OPS[op](inputs)


def warm_pool() -> None:
    # Pre-spawn the worker at startup so the first real /compute doesn't pay the
    # one-time process spawn + sympy import. Best-effort: a restricted environment
    # that can't fork/spawn just falls through to lazy creation on first request.
    if COMPUTE_TIMEOUT_S <= 0 or "simplify" not in OPS:
        return
    try:
        _get_pool().submit(_run_op, "simplify", {"expr": "x"}).result(timeout=COMPUTE_TIMEOUT_S)
    except Exception:
        _kill_pool()


def shutdown_pool() -> None:
    _kill_pool()


def _too_long(value) -> bool:
    if isinstance(value, str):
        return len(value) > MAX_STR_LEN
    if isinstance(value, (list, tuple)):
        return any(_too_long(v) for v in value)
    if isinstance(value, dict):
        return any(_too_long(v) for v in value.values())
    return False


def dispatch(req: ComputeRequest) -> ComputeResponse:
    # Guard every string input (expr, expr1/expr2, var, nested arrays), not just
    # "expr", so a pathological payload on any field can't peg the CPU.
    if any(_too_long(v) for v in req.inputs.values()):
        return ComputeResponse(ok=False, error=f"Input too long (max {MAX_STR_LEN} chars per string)")
    if req.op not in OPS:
        raise HTTPException(status_code=404, detail=f"Unknown op: {req.op!r}")
    # Timeout <= 0 opts out of worker isolation and runs inline.
    if COMPUTE_TIMEOUT_S <= 0:
        try:
            return ComputeResponse(ok=True, result=_run_op(req.op, req.inputs))
        except Exception as exc:
            return ComputeResponse(ok=False, error=str(exc))
    try:
        future = _get_pool().submit(_run_op, req.op, req.inputs)
        result = future.result(timeout=COMPUTE_TIMEOUT_S)
        return ComputeResponse(ok=True, result=result)
    except FutureTimeout:
        _kill_pool()  # kill the stuck worker; next request rebuilds the pool
        return ComputeResponse(
            ok=False,
            error=f"Computation exceeded {COMPUTE_TIMEOUT_S:g}s and was cancelled",
        )
    except BrokenProcessPool as exc:
        _kill_pool()  # worker died (e.g. OOM/segfault); recover for next request
        return ComputeResponse(ok=False, error=f"Worker process failed: {exc}")
    except Exception as exc:
        return ComputeResponse(ok=False, error=str(exc))
