
"""Z-Guard AI Engine Configuration."""

from pathlib import Path

# Absolute path to the ai_engine directory.
AI_ENGINE_DIR = Path(__file__).resolve().parent

# Random seed for reproducible results.
RANDOM_SEED = 42

# Dataset and trained model paths.
# These paths work regardless of the terminal's current directory.
DATA_PATH = str(AI_ENGINE_DIR / "data" / "operational_events.csv")
MODEL_PATH = str(AI_ENGINE_DIR / "artifacts" / "isolation_forest.joblib")

# Operational metrics used by the anomaly detection model.
FEATURE_COLUMNS = [
    "response_time_ms",
    "error_rate",
    "cpu_usage_pct",
    "transactions_per_minute",
]

# Initial anomaly score thresholds for risk classification.
MEDIUM_SCORE_THRESHOLD = 0.55
HIGH_SCORE_THRESHOLD = 0.78

# Rule-based detection thresholds.
RESPONSE_TIME_THRESHOLD = 900
ERROR_RATE_THRESHOLD = 0.08
CPU_USAGE_THRESHOLD = 85
TRANSACTION_VOLUME_THRESHOLD = 150
