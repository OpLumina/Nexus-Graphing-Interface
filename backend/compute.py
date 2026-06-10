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


def dispatch(req: ComputeRequest) -> ComputeResponse:
    if len(str(req.inputs.get("expr", ""))) > 500:
        return ComputeResponse(ok=False, error="Expression too long (max 500 chars)")
    handler = OPS.get(req.op)
    if handler is None:
        raise HTTPException(status_code=404, detail=f"Unknown op: {req.op!r}")
    try:
        result = handler(req.inputs)
        return ComputeResponse(ok=True, result=result)
    except Exception as exc:
        return ComputeResponse(ok=False, error=str(exc))
