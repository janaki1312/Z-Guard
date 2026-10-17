
"""Z-Guard REST API."""

from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query

from alert_store import alert_store
from schemas import (
    DetectionResult,
    HealthResponse,
    OperationalEvent,
)
from services import detection_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    detection_service.load()
    yield


app = FastAPI(
    title="Z-Guard API",
    description="AI-assisted operational anomaly detection",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=detection_service.model_loaded,
    )


@app.post("/api/analyze", response_model=DetectionResult)
def analyze_event(event: OperationalEvent):
    payload = event.model_dump()

    if not payload.get("event_id"):
        payload["event_id"] = str(uuid4())

    try:
        result = detection_service.analyze(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    alert_store.add_if_anomalous(result)
    return result


@app.get("/api/alerts")
def get_alerts(
    limit: int = Query(default=50, ge=1, le=200),
):
    return {
        "count": len(alert_store.list_alerts(limit)),
        "alerts": alert_store.list_alerts(limit),
    }


@app.get("/")
def root():
    return {
        "application": "Z-Guard",
        "message": "Operational anomaly detection API is running.",
        "docs": "/docs",
    }