
"""Z-Guard anomaly detection using ML and threshold rules."""

from pathlib import Path

import joblib

from config import (
    FEATURE_COLUMNS,
    HIGH_SCORE_THRESHOLD,
    MEDIUM_SCORE_THRESHOLD,
    MODEL_PATH,
)
from baseline import baseline_detect
from preprocess import prepare_event


BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / MODEL_PATH


class AnomalyDetector:
    """Combines Isolation Forest predictions with rule-based detection."""

    def __init__(self, model_path=MODEL_FILE):
        self.model_path = Path(model_path)
        self.model = None

    def load_model(self):
        """Load the trained Isolation Forest model."""
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {self.model_path}\n"
                "Run: python generate_data.py && python train_model.py"
            )

        self.model = joblib.load(self.model_path)
        return self

    def predict(self, event):
        """Return a combined anomaly assessment for one event."""
        if self.model is None:
            self.load_model()

        # Validate the input and arrange features in the expected order.
        X = prepare_event(event)

        # Isolation Forest returns -1 for an anomaly and 1 for normal.
        prediction = int(self.model.predict(X)[0])

        # Higher decision scores indicate more normal observations.
        # Negate the score so higher anomaly scores indicate more unusual data.
        raw_score = float(-self.model.decision_function(X)[0])

        # Convert the score into a bounded 0..1 display score.
        # This is a relative prototype score, not a calibrated probability.
        anomaly_score = max(0.0, min(1.0, 0.5 + raw_score))

        baseline = baseline_detect(event)
        rule_signals = baseline["signals"]

        # Combine the ML result and threshold rules.
        is_anomaly = prediction == -1 or baseline["is_anomaly"]

        if is_anomaly and (
            anomaly_score >= HIGH_SCORE_THRESHOLD or len(rule_signals) >= 2
        ):
            severity = "HIGH"
        elif is_anomaly or anomaly_score >= MEDIUM_SCORE_THRESHOLD:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        if rule_signals and prediction == -1:
            explanation = (
                "ML model and threshold rules both indicate unusual behavior."
            )
        elif rule_signals:
            explanation = (
                "Threshold rules detected unusual operational signals."
            )
        elif prediction == -1:
            explanation = (
                "ML model identified an unusual pattern compared with "
                "normal training data."
            )
        else:
            explanation = "No anomaly detected by the current checks."

        return {
            "is_anomaly": bool(is_anomaly),
            "severity": severity,
            "anomaly_score": round(anomaly_score, 4),
            "signals": rule_signals,
            "ml_prediction": (
                "anomaly" if prediction == -1 else "normal"
            ),
            "explanation": explanation,
            "model": "z_guard_isolation_forest",
            "baseline": baseline["baseline"],
        }


if __name__ == "__main__":
    detector = AnomalyDetector()

    examples = [
        {
            "response_time_ms": 180,
            "error_rate": 0.01,
            "cpu_usage_pct": 35,
            "transactions_per_minute": 500,
        },
        {
            "response_time_ms": 1450,
            "error_rate": 0.16,
            "cpu_usage_pct": 94,
            "transactions_per_minute": 80,
        },
    ]

    for event in examples:
        print("\nInput event:", event)
        print("Detection result:", detector.predict(event))
