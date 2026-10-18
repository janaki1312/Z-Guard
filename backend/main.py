
"""Z-Guard REST API with persistent accounts, sessions, and user-owned alerts."""

from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Literal

from backend.alert_store import alert_store
from backend.auth_store import auth_store
from backend.schemas import DetectionResult, HealthResponse, OperationalEvent
from backend.services import detection_service


security = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=256)


class AlertStatusUpdate(BaseModel):
    status: Literal["New", "In Progress", "Resolved", "Dismissed"]


class UserView(BaseModel):
    id: int
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserView


@asynccontextmanager
async def lifespan(app: FastAPI):
    detection_service.load()
    yield


app = FastAPI(
    title="Z-Guard API",
    description="AI-assisted operational anomaly detection with user accounts",
    version="2.0.0",
    lifespan=lifespan,
)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Sign in to access this resource.",
        )

    user = auth_store.get_user_for_token(credentials.credentials)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid. Please sign in again.",
        )

    return user


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=detection_service.model_loaded,
    )


@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(credentials: Credentials):
    try:
        user, token = auth_store.register(
            credentials.email,
            credentials.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"access_token": token, "user": user}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(credentials: Credentials):
    result = auth_store.login(credentials.email, credentials.password)

    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Email or password is incorrect.",
        )

    user, token = result
    return {"access_token": token, "user": user}


@app.post("/api/auth/logout")
def logout(
    user=Depends(current_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    auth_store.logout(credentials.credentials)
    return {"ok": True}


@app.get("/api/auth/me", response_model=UserView)
def me(user=Depends(current_user)):
    return user


@app.post("/api/analyze", response_model=DetectionResult)
def analyze_event(
    event: OperationalEvent,
    user=Depends(current_user),
):
    payload = event.model_dump()

    if not payload.get("event_id"):
        payload["event_id"] = str(uuid4())

    try:
        result = detection_service.analyze(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    alert_store.add_if_anomalous(user["id"], result)
    return result


@app.get("/api/alerts")
def get_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    user=Depends(current_user),
):
    alerts = alert_store.list_alerts(user["id"], limit)
    return {"count": len(alerts), "alerts": alerts}


@app.patch("/api/alerts/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    update: AlertStatusUpdate,
    user=Depends(current_user),
):
    if alert_id < 1:
        raise HTTPException(status_code=404, detail="Alert not found.")

    updated = alert_store.update_status(
        user["id"],
        alert_id,
        update.status,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found.")

    return {"ok": True, "alert_id": alert_id, "status": update.status}


@app.get("/api/demo/overview")
def demo_overview():
    """Read-only illustrative sample data; never writes to the real alert store."""
    return {
        "mode": "demo",
        "read_only": True,
        "message": "Illustrative demo data — not live system telemetry.",
        "metrics": {
            "alerts_loaded": 12,
            "anomalies": 4,
            "critical": 1,
            "high": 2,
            "medium": 1,
            "low": 0,
        },
        "activity": [
            {"label": "09:00", "response_time_ms": 180, "cpu_usage_pct": 32, "anomalies": 0},
            {"label": "09:10", "response_time_ms": 240, "cpu_usage_pct": 41, "anomalies": 0},
            {"label": "09:20", "response_time_ms": 870, "cpu_usage_pct": 76, "anomalies": 2},
            {"label": "09:30", "response_time_ms": 410, "cpu_usage_pct": 54, "anomalies": 1},
            {"label": "09:40", "response_time_ms": 210, "cpu_usage_pct": 38, "anomalies": 0},
            {"label": "09:50", "response_time_ms": 690, "cpu_usage_pct": 82, "anomalies": 1},
        ],
        "alerts": [
            {
                "event_id": "DEMO-1042",
                "is_anomaly": True,
                "severity": "HIGH",
                "anomaly_score": 0.91,
                "response_time_ms": 870,
                "cpu_usage_pct": 76,
                "signals": ["high_response_latency", "elevated_error_rate"],
                "explanation": "Demo record: elevated latency and error rate.",
            },
            {
                "event_id": "DEMO-1039",
                "is_anomaly": True,
                "severity": "MEDIUM",
                "anomaly_score": 0.74,
                "response_time_ms": 690,
                "cpu_usage_pct": 82,
                "signals": ["high_cpu_utilization"],
                "explanation": "Demo record: CPU utilization is elevated.",
            },
        ],
    }


FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


@app.get("/")
def root():
    index_file = FRONTEND_DIST / "index.html"

    if index_file.is_file():
        return FileResponse(index_file)

    return {
        "application": "Z-Guard",
        "message": "Operational anomaly detection API is running.",
        "docs": "/docs",
    }


if FRONTEND_DIST.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend",
    )
