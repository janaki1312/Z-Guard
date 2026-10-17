
# Z-Guard AI Engine Configuration

# Random seed for reproducible results
RANDOM_SEED = 42

# Dataset file path
DATA_PATH = "data/operational_events.csv"

# Trained model file path
MODEL_PATH = "artifacts/isolation_forest.joblib"

# Operational metrics used by the anomaly detection model
FEATURE_COLUMNS = [
    "response_time_ms",
    "error_rate",
    "cpu_usage_pct",
    "transactions_per_minute"
]

# Initial anomaly score thresholds for risk classification
MEDIUM_SCORE_THRESHOLD = 0.55
HIGH_SCORE_THRESHOLD = 0.78

# Rule-based detection thresholds
RESPONSE_TIME_THRESHOLD = 900
ERROR_RATE_THRESHOLD = 0.08
CPU_USAGE_THRESHOLD = 85
TRANSACTION_VOLUME_THRESHOLD = 150
