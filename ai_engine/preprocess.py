
"""
Z-Guard - Data Preprocessing Module

Validates and prepares operational telemetry for the
anomaly detection model.
"""

import pandas as pd

from schemas import FEATURE_COLUMNS, validate_dataset_columns, validate_event


def prepare_frame(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and prepare a DataFrame for model training
    or batch prediction.

    Args:
        df: DataFrame containing operational metrics.

    Returns:
        DataFrame containing only the required features,
        in the correct order.
    """

    if not isinstance(df, pd.DataFrame):
        raise TypeError("Input must be a pandas DataFrame.")

    if df.empty:
        raise ValueError("Input dataset cannot be empty.")

    # Check that all required feature columns exist.
    validate_dataset_columns(df.columns)

    # Keep features in the same order expected by the model.
    prepared = df[FEATURE_COLUMNS].copy()

    # Ensure all feature columns contain numeric values.
    for column in FEATURE_COLUMNS:
        prepared[column] = pd.to_numeric(
            prepared[column],
            errors="raise"
        )

    # Reject missing values.
    if prepared.isnull().any().any():
        raise ValueError(
            "Dataset contains missing feature values."
        )

    # Reject infinite values.
    if not prepared.map(
        lambda value: __import__("math").isfinite(float(value))
    ).all().all():
        raise ValueError(
            "Dataset contains non-finite feature values."
        )

    # Validate operational ranges for every row.
    for row_number, row in enumerate(
        prepared.to_dict(orient="records"),
        start=1
    ):
        try:
            validate_event(row)
        except (TypeError, ValueError) as error:
            raise ValueError(
                f"Invalid event at data row {row_number}: {error}"
            ) from error

    return prepared


def prepare_event(event: dict) -> pd.DataFrame:
    """
    Validate one operational event and convert it into
    a one-row DataFrame for model inference.
    """

    validate_event(event)

    # Construct a one-row DataFrame with consistent feature ordering.
    return pd.DataFrame(
        [{column: event[column] for column in FEATURE_COLUMNS}],
        columns=FEATURE_COLUMNS
    )


if __name__ == "__main__":

    # Example: a valid event.
    sample_event = {
        "response_time_ms": 250,
        "error_rate": 0.02,
        "cpu_usage_pct": 55,
        "transactions_per_minute": 600,
    }

    print("Testing single-event preprocessing...")

    prepared_event = prepare_event(sample_event)
    print(prepared_event)

    print("\nTesting DataFrame preprocessing...")

    sample_df = pd.DataFrame([
        sample_event,
        {
            "response_time_ms": 300,
            "error_rate": 0.01,
            "cpu_usage_pct": 45,
            "transactions_per_minute": 650,
        }
    ])

    prepared_df = prepare_frame(sample_df)
    print(prepared_df)

    print("\nPreprocessing completed successfully.")
