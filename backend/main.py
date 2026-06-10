from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from compute import ComputeRequest, ComputeResponse, dispatch

app = FastAPI(title="NexusGraph Math Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/compute", response_model=ComputeResponse)
def compute(req: ComputeRequest) -> ComputeResponse:
    return dispatch(req)
