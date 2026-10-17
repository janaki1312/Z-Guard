
"""Service layer connecting the API to the Z-Guard AI engine."""

import sys
from pathlib import Path
from uuid import uuid4

AI_ENGINE_DIR = Path(__file__).resolve().parents[1] / "ai_engine"

# Prioritize the AI engine directory so its schemas.py
# is used by detector.py and baseline.py.
# Keep the AI engine's imports separate from backend modules.
if str(AI_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_ENGINE_DIR))

# Remove a previously loaded backend schemas module so the
# AI engine can import its own schemas.py.
loaded_schemas = sys.modules.get("schemas")
if loaded_schemas is not None:
    loaded_file = getattr(loaded_schemas, "__file__", "")
    if loaded_file and "backend" in str(loaded_file).lower():
        del sys.modules["schemas"]

from detector import AnomalyDetector  # noqa: E402


class DetectionService:
    """Loads the AI detector once and reuses it for predictions."""

    def __init__(self):
        self.detector = AnomalyDetector()
        self.model_loaded = False
        self.load_error = None

    def load(self):
        """Attempt to load the trained model."""
        try:
            self.detector.load_model()
            self.model_loaded = True
            self.load_error = None
        except (FileNotFoundError, OSError, ValueError) as exc:
            self.model_loaded = False
            self.load_error = str(exc)

    def analyze(self, event: dict) -> dict:
        """Analyze one event and return the detection result."""
        if not self.model_loaded:
            self.load()

        if not self.model_loaded:
            raise RuntimeError(
                "The AI model is unavailable. Generate the dataset and "
                "train the model before requesting predictions."
            )

        result = self.detector.predict(event)

        return {
            "event_id": event.get("event_id") or str(uuid4()),
            **result,
        }


detection_service = DetectionService()