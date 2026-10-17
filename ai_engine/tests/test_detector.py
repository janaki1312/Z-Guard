
"""Tests for the Z-Guard anomaly detector."""

import sys
from pathlib import Path

import pytest

AI_ENGINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ENGINE_DIR))

from detector import AnomalyDetector  # noqa: E402


VALID_EVENT = {
    "response_time_ms": 180,
    "error_rate": 0.01,
    "cpu_usage_pct": 35,
    "transactions_per_minute": 500,
}

SUSPICIOUS_EVENT = {
    "response_time_ms": 1450,
    "error_rate": 0.16,
    "cpu_usage_pct": 94,
    "transactions_per_minute": 80,
}


@pytest.fixture
def detector():
    """Create a detector using the trained model."""
    model_path = AI_ENGINE_DIR / "artifacts" / "isolation_forest.joblib"

    if not model_path.exists():
        pytest.skip(
            "Trained model not found. Run generate_data.py and train_model.py first."
        )

    return AnomalyDetector(model_path=model_path).load_model()


def test_detector_loads_model(detector):
    assert detector.model is not None


def test_detector_returns_expected_fields(detector):
    result = detector.predict(VALID_EVENT)

    expected_fields = {
        "is_anomaly",
        "severity",
        "anomaly_score",
        "signals",
        "ml_prediction",
        "explanation",
        "model",
        "baseline",
    }

    assert expected_fields.issubset(result.keys())


def test_detector_result_types(detector):
    result = detector.predict(VALID_EVENT)

    assert isinstance(result["is_anomaly"], bool)
    assert result["severity"] in {"LOW", "MEDIUM", "HIGH"}
    assert isinstance(result["anomaly_score"], float)
    assert 0.0 <= result["anomaly_score"] <= 1.0
    assert isinstance(result["signals"], list)
    assert isinstance(result["explanation"], str)


def test_detector_flags_rule_based_suspicious_event(detector):
    result = detector.predict(SUSPICIOUS_EVENT)

    # All four rule thresholds are exceeded or breached by this example.
    assert result["is_anomaly"] is True
    assert result["severity"] == "HIGH"
    assert len(result["signals"]) >= 2


def test_detector_rejects_invalid_event(detector):
    invalid_event = VALID_EVENT.copy()
    invalid_event["cpu_usage_pct"] = 150

    with pytest.raises((ValueError, TypeError)):
        detector.predict(invalid_event)


def test_detector_rejects_missing_model(tmp_path):
    missing_model = tmp_path / "missing_model.joblib"
    instance = AnomalyDetector(model_path=missing_model)

    with pytest.raises(FileNotFoundError):
        instance.load_model()
