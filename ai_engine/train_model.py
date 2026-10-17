
"""Train and save the Z-Guard Isolation Forest model."""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from config import DATA_PATH, FEATURE_COLUMNS, MODEL_PATH, RANDOM_SEED
from preprocess import prepare_frame


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / DATA_PATH
MODEL_FILE = BASE_DIR / MODEL_PATH
TRAIN_FILE = BASE_DIR / "data" / "train_events.csv"
TEST_FILE = BASE_DIR / "data" / "test_events.csv"
METADATA_FILE = BASE_DIR / "artifacts" / "model_metadata.json"


def train_model():
    """Train on normal training examples and save model and test data."""

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}\n"
            "Run this first: python generate_data.py"
        )

    df = pd.read_csv(DATA_FILE)

    if "label" not in df.columns:
        raise ValueError("Dataset must contain a 'label' column.")

    if not set(FEATURE_COLUMNS).issubset(df.columns):
        raise ValueError("Dataset is missing one or more required features.")

    if not set(df["label"].dropna().unique()).issubset({0, 1}):
        raise ValueError("The label column must contain only 0 and 1.")

    if df["label"].isna().any():
        raise ValueError("The label column contains missing values.")

    # Keep the held-out test set separate from model training.
    train_df, test_df = train_test_split(
        df,
        test_size=0.25,
        random_state=RANDOM_SEED,
        stratify=df["label"],
    )

    # Isolation Forest learns the pattern of normal operations.
    normal_train = train_df[train_df["label"] == 0]

    if len(normal_train) < 10:
        raise ValueError("Not enough normal events to train the model.")

    X_train = prepare_frame(normal_train[FEATURE_COLUMNS])

    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_train)

    # Save the model and held-out data for later evaluation.
    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    TRAIN_FILE.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_FILE)
    train_df.to_csv(TRAIN_FILE, index=False)
    test_df.to_csv(TEST_FILE, index=False)

    metadata = {
        "model_name": "Z-Guard Isolation Forest",
        "algorithm": "IsolationForest",
        "random_seed": RANDOM_SEED,
        "training_rows_total": int(len(train_df)),
        "training_rows_normal": int(len(normal_train)),
        "test_rows": int(len(test_df)),
        "feature_columns": FEATURE_COLUMNS,
        "training_method": "Fit on normal training examples only",
        "dataset_type": "Synthetic demonstration data",
    }

    METADATA_FILE.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print("Z-Guard model training completed.")
    print(f"Model saved to: {MODEL_FILE}")
    print(f"Metadata saved to: {METADATA_FILE}")
    print(f"Training rows: {len(train_df)}")
    print(f"Normal rows used for fitting: {len(normal_train)}")
    print(f"Held-out test rows: {len(test_df)}")


if __name__ == "__main__":
    train_model()
