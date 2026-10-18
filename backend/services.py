
"""Service layer connecting the API to the Z-Guard AI engine."""

import importlib
import importlib.util
import sys
from pathlib import Path
from uuid import uuid4

AI_ENGINE_DIR = Path(__file__).resolve().parents[1] / "ai_engine"
AI_ENGINE_DIR_STR = str(AI_ENGINE_DIR)

# Load the AI engine's schemas under a unique module name.
ai_schema_name = "zguard_ai_schemas"
ai_schema_path = AI_ENGINE_DIR / "schemas.py"

if ai_schema_name not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        ai_schema_name,
        ai_schema_path,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load AI schemas from {ai_schema_path}")

    ai_schemas = importlib.util.module_from_spec(spec)
    sys.modules[ai_schema_name] = ai_schemas
    spec.loader.exec_module(ai_schemas)
else:
    ai_schemas = sys.modules[ai_schema_name]


class DetectionService:
    """Loads the AI detector once and reuses it for predictions."""

    def __init__(self):
        self.detector = None
        self.model_loaded = False
        self.load_error = None

    def load(self):
        """Load the detector with the correct AI schema."""
        backend_schemas = sys.modules.get("schemas")

        if AI_ENGINE_DIR_STR not in sys.path:
            sys.path.insert(0, AI_ENGINE_DIR_STR)

        # Temporarily expose AI schemas under the import name used
        # by baseline.py and other AI engine modules.
        sys.modules["schemas"] = ai_schemas

        try:
            # Import while the AI schema is active.
            detector_module = importlib.import_module("detector")
            self.detector = detector_module.AnomalyDetector()
            self.detector.load_model()
            self.model_loaded = True
            self.load_error = None
        except (FileNotFoundError, OSError, ValueError) as exc:
            self.model_loaded = False
            self.load_error = str(exc)
        finally:
            # Restore the backend schema for main.py.
            if backend_schemas is None:
                sys.modules.pop("schemas", None)
            else:
                sys.modules["schemas"] = backend_schemas

            if AI_ENGINE_DIR_STR in sys.path:
                sys.path.remove(AI_ENGINE_DIR_STR)

    def analyze(self, event: dict) -> dict:
        """Analyze one event and return the detection result."""
        if not self.model_loaded:
            self.load()

        if not self.model_loaded or self.detector is None:
            raise RuntimeError(
                "The AI model is unavailable. Generate the dataset and "
                "train the model before requesting predictions."
            )

        # Baseline modules may import schemas when called, so keep
        # the AI schema active during prediction too.
        backend_schemas = sys.modules.get("schemas")
        sys.modules["schemas"] = ai_schemas

        if AI_ENGINE_DIR_STR not in sys.path:
            sys.path.insert(0, AI_ENGINE_DIR_STR)

        try:
            result = self.detector.predict(event)
        finally:
            if backend_schemas is None:
                sys.modules.pop("schemas", None)
            else:
                sys.modules["schemas"] = backend_schemas

            if AI_ENGINE_DIR_STR in sys.path:
                sys.path.remove(AI_ENGINE_DIR_STR)

        return {
            **event,
            **result,
            "event_id": event.get("event_id") or str(uuid4()),
        }


detection_service = DetectionService()
