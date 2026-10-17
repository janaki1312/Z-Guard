
"""
Z-Guard - Operational Event Schema

Validates incoming operational telemetry before it reaches
the preprocessing and anomaly detection modules.
"""

import math


# Required operational metrics.
FEATURE_COLUMNS = [
    "response_time_ms",
    "error_rate",
    "cpu_usage_pct",
    "transactions_per_minute",
]

# Every prediction event must contain these fields.
REQUIRED_FIELDS = FEATURE_COLUMNS


def validate_event(event: dict) -> None:
    """
    Validate one operational event.

    Args:
        event: Dictionary containing operational metrics.

    Returns:
        None if the event is valid.

    Raises:
        TypeError: If the event is not a dictionary.
        ValueError: If required fields or values are invalid.
    """

    # 1. Ensure that the input is a dictionary.
    if not isinstance(event, dict):
        raise TypeError("Event must be a dictionary.")

    # 2. Check that all required fields are present.
    missing_fields = [
        field
        for field in REQUIRED_FIELDS
        if field not in event
    ]

    if missing_fields:
        raise ValueError(
            f"Missing required fields: {', '.join(missing_fields)}"
        )

    # 3. Check that every feature contains a valid number.
    for field in FEATURE_COLUMNS:
        value = event[field]

        # Booleans should not be accepted as numbers.
        if isinstance(value, bool) or not isinstance(
            value, (int, float)
        ):
            raise ValueError(
                f"'{field}' must be a numeric value."
            )

        # Reject NaN and infinity.
        if not math.isfinite(value):
            raise ValueError(
                f"'{field}' must be a finite number."
            )

    # 4. Validate response time.
    if event["response_time_ms"] < 0:
        raise ValueError(
            "Response time must be greater than or equal to zero."
        )

    # 5. Validate error rate.
    if not 0 <= event["error_rate"] <= 1:
        raise ValueError(
            "Error rate must be between 0 and 1."
        )

    # 6. Validate CPU utilization.
    if not 0 <= event["cpu_usage_pct"] <= 100:
        raise ValueError(
            "CPU usage must be between 0 and 100."
        )

    # 7. Validate transaction volume.
    if event["transactions_per_minute"] < 0:
        raise ValueError(
            "Transactions per minute cannot be negative."
        )


def validate_dataset_columns(columns) -> None:
    """
    Ensure a dataset contains all required feature columns.

    Args:
        columns: Column names from a CSV or DataFrame.

    Raises:
        ValueError: If any required feature is missing.
    """

    missing_columns = [
        field
        for field in FEATURE_COLUMNS
        if field not in columns
    ]

    if missing_columns:
        raise ValueError(
            f"Dataset is missing columns: "
            f"{', '.join(missing_columns)}"
        )


if __name__ == "__main__":

    # Example of a valid operational event.
    sample_event = {
        "response_time_ms": 250,
        "error_rate": 0.02,
        "cpu_usage_pct": 55,
        "transactions_per_minute": 600,
    }

    try:
        validate_event(sample_event)
        print("Valid event: all operational metrics passed validation.")

    except (TypeError, ValueError) as error:
        print(f"Invalid event: {error}")

    # Example of an invalid operational event.
    invalid_event = {
        "response_time_ms": -100,
        "error_rate": 0.02,
        "cpu_usage_pct": 55,
        "transactions_per_minute": 600,
    }

    try:
        validate_event(invalid_event)
        print("Valid event.")

    except (TypeError, ValueError) as error:
        print(f"Invalid event detected: {error}")
