
"""Request and response schemas for the Z-Guard API."""

from typing import Literal

from pydantic import BaseModel, Field


class OperationalEvent(BaseModel):
    """Operational metrics submitted for anomaly detection."""

    event_id: str | None = None

    response_time_ms: float = Field(ge=0)
    error_rate: float = Field(ge=0, le=1)
    cpu_usage_pct: float = Field(ge=0, le=100)
    transactions_per_minute: float = Field(ge=0)


class DetectionResult(BaseModel):
    """Structured result returned to the dashboard."""

    event_id: str
    is_anomaly: bool
    severity: Literal["LOW", "MEDIUM", "HIGH"]
    anomaly_score: float = Field(ge=0, le=1)
    signals: list[str]
    ml_prediction: str
    explanation: str
    model: str
    baseline: str


class HealthResponse(BaseModel):
    """Backend health-check response."""

    status: str
    model_loaded: bool
    application: str = "Z-Guard"