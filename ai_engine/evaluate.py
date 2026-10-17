
"""Evaluate Z-Guard on held-out synthetic operational events."""

from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

from config import FEATURE_COLUMNS
from detector import AnomalyDetector
from preprocess import prepare_event


BASE_DIR = Path(__file__).resolve().parent
TEST_FILE = BASE_DIR / "data" / "test_events.csv"


def evaluate_model():
    """Evaluate predictions against labels in the held-out test set."""

    if not TEST_FILE.exists():
        raise FileNotFoundError(
            f"Test dataset not found: {TEST_FILE}\n"
            "Run: python generate_data.py && python train_model.py"
        )

    df = pd.read_csv(TEST_FILE)

    required = set(FEATURE_COLUMNS) | {"label"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Test dataset is missing columns: {sorted(missing)}")

    if df.empty:
        raise ValueError("The test dataset is empty.")

    detector = AnomalyDetector()
    detector.load_model()

    actual = []
    predicted = []

    for _, row in df.iterrows():
        event = {column: row[column] for column in FEATURE_COLUMNS}
        result = detector.predict(event)

        # Dataset labels: 0 = normal, 1 = anomaly.
        actual.append(int(row["label"]))
        predicted.append(1 if result["is_anomaly"] else 0)

    print("\nZ-Guard Evaluation")
    print("==================")
    print(f"Test events: {len(df)}")
    print(f"Actual anomalies: {sum(actual)}")
    print(f"Predicted anomalies: {sum(predicted)}")

    print("\nConfusion matrix")
    print("Rows = actual [normal, anomaly]")
    print("Columns = predicted [normal, anomaly]")
    print(confusion_matrix(actual, predicted, labels=[0, 1]))

    print("\nClassification report")
    print(
        classification_report(
            actual,
            predicted,
            labels=[0, 1],
            target_names=["Normal", "Anomaly"],
            zero_division=0,
        )
    )

    print(f"Precision: {precision_score(actual, predicted, zero_division=0):.3f}")
    print(f"Recall:    {recall_score(actual, predicted, zero_division=0):.3f}")
    print(f"F1-score:  {f1_score(actual, predicted, zero_division=0):.3f}")

    print(
        "\nNote: These metrics measure performance on synthetic test data. "
        "They do not establish performance on real operational telemetry."
    )


if __name__ == "__main__":
    evaluate_model()
