
"""Simple in-memory alert history for the Z-Guard MVP."""

from collections import deque
from threading import Lock


class AlertStore:
    """Stores recent anomalous events, newest first."""

    def __init__(self, max_alerts: int = 200):
        self._alerts = deque(maxlen=max_alerts)
        self._lock = Lock()

    def add_if_anomalous(self, result: dict) -> None:
        if not result.get("is_anomaly", False):
            return

        with self._lock:
            self._alerts.appendleft(result.copy())

    def list_alerts(self, limit: int = 50) -> list[dict]:
        with self._lock:
            return list(self._alerts)[:limit]

    def clear(self) -> None:
        with self._lock:
            self._alerts.clear()


alert_store = AlertStore()