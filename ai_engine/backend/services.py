
"""Service layer connecting the API to the Z-Guard AI engine."""

import sys
from pathlib import Path
from uuid import uuid4

AI_ENGINE_DIR = Path(__file__).resolve().parents[1] / "ai_engine"

# Allow imports from the sibling ai_engine directory.
if str(AI_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_ENGINE_DIR))

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