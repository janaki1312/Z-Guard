
"""
Z-Guard - Rule-Based Anomaly Detection

Checks operational telemetry against configurable thresholds.

This baseline is transparent and will later be compared
with the machine-learning anomaly detector.
"""

from config import (
    RESPONSE_TIME_THRESHOLD,
    ERROR_RATE_THRESHOLD,
    CPU_USAGE_THRESHOLD,
    TRANSACTION_VOLUME_THRESHOLD,
)
from schemas import validate_event


def baseline_detect(event: dict) -> dict:
    """
    Detect suspicious operational metrics using rules.

    Args:
        event: Dictionary containing operational metrics.

    Returns:
        Dictionary containing the anomaly flag and triggered signals.
    """

    # Reject invalid input before applying any rules.
    validate_event(event)

    signals = []

    # Rule 1: Transaction response time is unusually high.
    if event["response_time_ms"] > RESPONSE_TIME_THRESHOLD:
        signals.append("high_response_latency")

    # Rule 2: The fraction of failed transactions is elevated.
    if event["error_rate"] > ERROR_RATE_THRESHOLD:
        signals.append("elevated_error_rate")

    # Rule 3: CPU utilization is unusually high.
    if event["cpu_usage_pct"] > CPU_USAGE_THRESHOLD:
        signals.append("high_cpu_utilization")

    # Rule 4: Transaction volume is unusually low.
    if (
        event["transactions_per_minute"]
        < TRANSACTION_VOLUME_THRESHOLD
    ):
        signals.append("low_transaction_volume")

    # An event is flagged if at least one rule is triggered.
    is_anomaly = len(signals) > 0

    return {
        "is_anomaly": is_anomaly,
        "signals": signals,
        "baseline": "z_guard_threshold_rules",
    }


if __name__ == "__main__":

    # Example 1: Normal operational behavior.
    normal_event = {
        "response_time_ms": 220,
        "error_rate": 0.01,
        "cpu_usage_pct": 45,
        "transactions_per_minute": 650,
    }

    # Example 2: Multiple concerning operational signals.
    suspicious_event = {
        "response_time_ms": 1800,
        "error_rate": 0.12,
        "cpu_usage_pct": 91,
        "transactions_per_minute": 500,
    }

    print("\n--- Normal Event ---")
    print(baseline_detect(normal_event))

    print("\n--- Suspicious Event ---")
    print(baseline_detect(suspicious_event))
