from pydantic import BaseModel
from typing import Literal, Any


class SymbolicRequest(BaseModel):
    expr: str
    op: Literal["solve", "factor", "expand", "simplify", "derivative", "integral", "limit"]
    var: str = "x"
    extra: dict[str, Any] = {}


class SymbolicResponse(BaseModel):
    result: str
    latex: str
    ok: bool
    error: str | None = None


class SampleRequest(BaseModel):
    expr: str
    var: str = "x"
    x_min: float
    x_max: float
    n: int = 1000


class SampleResponse(BaseModel):
    xs: list[float]
    ys: list[float]
    ok: bool
    error: str | None = None


class RegressionRequest(BaseModel):
    xs: list[float]
    ys: list[float]
    model: Literal["linear", "polynomial", "exponential", "logarithmic", "power", "logistic"]
    degree: int = 2  # used for polynomial


class RegressionResponse(BaseModel):
    params: list[float]
    r_squared: float
    fitted_ys: list[float]
    expr: str
    ok: bool
    error: str | None = None


class AnalysisRequest(BaseModel):
    expr: str
    var: str = "x"
    x_min: float = -10.0
    x_max: float = 10.0


class AnalysisResponse(BaseModel):
    roots: list[float]
    critical_points: list[float]
    inflection_points: list[float]
    domain: str
    ok: bool
    error: str | None = None


class IntersectionPoint(BaseModel):
    x: float
    y: float
    slope1: float
    slope2: float
    reflect_slope: float | None
    description: str


class ReflectRequest(BaseModel):
    expr1: str
    expr2: str
    var: str = "x"
    x_min: float = -10.0
    x_max: float = 10.0


class ReflectResponse(BaseModel):
    intersections: list[IntersectionPoint]
    both_nonlinear: bool
    ok: bool
    error: str | None = None
