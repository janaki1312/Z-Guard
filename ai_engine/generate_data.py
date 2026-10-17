
"""
Z-Guard - Synthetic Operational Data Generator

Generates sample operational telemetry for developing and
testing the anomaly detection engine.

Labels:
    0 = Normal event
    1 = Anomalous event

IMPORTANT:
This is synthetic data, not real banking or production telemetry.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from config import RANDOM_SEED


def generate_dataset(
    n_normal: int = 1000,
    n_anomaly: int = 150
) -> pd.DataFrame:
    """
    Generate synthetic operational events.

    Args:
        n_normal: Number of normal events to generate.
        n_anomaly: Number of anomalous events to generate.

    Returns:
        A shuffled pandas DataFrame containing operational metrics
        and ground-truth labels.
    """

    if n_normal < 1 or n_anomaly < 1:
        raise ValueError(
            "n_normal and n_anomaly must both be greater than zero."
        )

    rng = np.random.default_rng(RANDOM_SEED)

    # -------------------------------------------------
    # 1. Generate normal operational behavior
    # -------------------------------------------------

    normal_data = pd.DataFrame({
        "response_time_ms": np.clip(
            rng.normal(220, 55, n_normal),
            40,
            None
        ),

        "error_rate": np.clip(
            rng.normal(0.015, 0.008, n_normal),
            0,
            0.08
        ),

        "cpu_usage_pct": np.clip(
            rng.normal(48, 13, n_normal),
            5,
            85
        ),

        "transactions_per_minute": np.clip(
            rng.normal(650, 120, n_normal),
            100,
            None
        ),

        "label": 0
    })

    # -------------------------------------------------
    # 2. Generate anomalous operational behavior
    # -------------------------------------------------

    anomaly_data = pd.DataFrame({
        "response_time_ms": np.clip(
            rng.normal(1250, 320, n_anomaly),
            350,
            None
        ),

        "error_rate": np.clip(
            rng.normal(0.16, 0.06, n_anomaly),
            0.04,
            0.45
        ),

        "cpu_usage_pct": np.clip(
            rng.normal(88, 7, n_anomaly),
            65,
            100
        ),

        "transactions_per_minute": np.clip(
            rng.normal(420, 180, n_anomaly),
            20,
            None
        ),

        "label": 1
    })

    # -------------------------------------------------
    # 3. Combine normal and anomalous events
    # -------------------------------------------------

    dataset = pd.concat(
        [normal_data, anomaly_data],
        ignore_index=True
    )

    # Shuffle the records so the classes are mixed.
    dataset = dataset.sample(
        frac=1,
        random_state=RANDOM_SEED
    ).reset_index(drop=True)

    return dataset


def save_dataset(
    output_path: str = "data/operational_events.csv",
    n_normal: int = 1000,
    n_anomaly: int = 150
) -> pd.DataFrame:
    """
    Generate the dataset and save it as a CSV file.
    """

    dataset = generate_dataset(
        n_normal=n_normal,
        n_anomaly=n_anomaly
    )

    path = Path(output_path)
    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    dataset.to_csv(path, index=False)

    print("\nZ-Guard synthetic dataset generated successfully.")
    print(f"Saved to: {path.resolve()}")
    print(f"Total events: {len(dataset)}")
    print(f"Normal events: {(dataset['label'] == 0).sum()}")
    print(f"Anomalous events: {(dataset['label'] == 1).sum()}")

    print("\nFirst five records:")
    print(dataset.head())

    return dataset


if __name__ == "__main__":
    save_dataset()
