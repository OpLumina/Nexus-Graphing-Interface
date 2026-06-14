import hmac
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from compute import (
    COMPUTE_TIMEOUT_S,
    ComputeRequest,
    ComputeResponse,
    dispatch,
    shutdown_pool,
    warm_pool,
)


def _read_version() -> str:
    # ENV-3: single source of truth for the app version so the backend, frontend
    # build, and Electron app all stamp the same number instead of drifting (was
    # backend 2.0.0 vs frontend 1.0.0). Precedence:
    #   1. NEXUS_VERSION env var — lets a container inject it without the root
    #      VERSION file being inside the (./backend) build context.
    #   2. The repo-root VERSION file — resolved for local `uvicorn main:app`
    #      runs (cwd backend/, so ../VERSION) and for an image that copies it in.
    env_version = os.environ.get("NEXUS_VERSION", "").strip()
    if env_version:
        return env_version
    for candidate in (Path(__file__).parent / "VERSION", Path(__file__).parent.parent / "VERSION"):
        try:
            return candidate.read_text(encoding="utf-8").strip()
        except OSError:
            continue
    return "0.0.0"


APP_VERSION = _read_version()

# SEC-5: CORS only constrains browsers — it does nothing against a non-browser
# local process POSTing straight to 127.0.0.1:8000. The LAN is already closed off
# (the host port is bound loopback-only in docker-compose.yml), so the residual
# threat is *another local process* on the same machine.
#
# Optional shared-secret gate: when NEXUS_API_TOKEN is set, /compute requires a
# matching X-Nexus-Token header. The desktop launchers (sysops/run-desktop.*)
# generate a per-session token and pass it to both this backend and the Vite
# proxy, which injects the header on the frontend's behalf — so the renderer
# never holds the token and an unrelated local process cannot call /compute.
# When the variable is unset (plain `docker compose up`, bare uvicorn) the gate
# is disabled and the endpoint trusts every local client; that trust assumption
# is logged loudly at startup.
API_TOKEN = os.environ.get("NEXUS_API_TOKEN", "").strip()

# ENV-8: /docs, /redoc, /openapi.json are convenient locally but leak the full
# API surface on any shared deployment. They stay on by default (local-only
# posture) and are disabled by setting NEXUS_ENABLE_DOCS to a falsy value
# (0/false/no/off/empty), which passes docs_url=None to FastAPI so the routes
# 404 entirely instead of merely hiding the link.
DOCS_ENABLED = os.environ.get("NEXUS_ENABLE_DOCS", "1").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
    "",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: announce the trust model (ARCH-7 — replaces the deprecated
    # @app.on_event("startup") hook with the lifespan context manager).
    log = logging.getLogger("uvicorn.error")
    if API_TOKEN:
        log.info("NEXUS_API_TOKEN set: /compute requires a valid X-Nexus-Token header.")
    else:
        log.warning(
            "NEXUS_API_TOKEN not set: /compute trusts ALL local clients on this host "
            "(any local process can call it). Set NEXUS_API_TOKEN to require an "
            "X-Nexus-Token header. Safe for a single-user local desktop session; "
            "do not expose this port beyond loopback."
        )
    if not DOCS_ENABLED:
        log.info("NEXUS_ENABLE_DOCS disabled: /docs, /redoc, /openapi.json return 404.")
    # ARCH-4: pre-spawn the compute worker so the first /compute isn't slowed by
    # process spawn + sympy import; log the active hard timeout.
    if COMPUTE_TIMEOUT_S > 0:
        warm_pool()
        log.info("Compute isolation on: each op runs in a worker with a %gs hard timeout.", COMPUTE_TIMEOUT_S)
    else:
        log.warning("NEXUS_COMPUTE_TIMEOUT <= 0: ops run inline with no timeout/isolation.")
    yield
    # Shutdown: tear down the worker pool.
    shutdown_pool()


app = FastAPI(
    title="NexusGraph Math Engine",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
)

# Restrict cross-origin access to the known frontend dev origins so an
# arbitrary website the user visits cannot POST to the local backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Nexus-Token"],
)


def require_token(x_nexus_token: str | None = Header(default=None)) -> None:
    """Reject /compute calls that lack the shared token, when one is configured."""
    if not API_TOKEN:
        return
    # Constant-time compare so a wrong token can't be recovered by timing.
    if x_nexus_token is None or not hmac.compare_digest(x_nexus_token, API_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid or missing API token")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/compute", response_model=ComputeResponse, dependencies=[Depends(require_token)])
def compute(req: ComputeRequest) -> ComputeResponse:
    return dispatch(req)
