"""Persistent, user-scoped anomalous-event history and workflow status."""
import json
import sqlite3
from pathlib import Path
import os

DB_PATH = Path(
    os.environ.get(
        "ZGUARD_DB_PATH",
        str(Path(__file__).resolve().parent / "zguard.sqlite3"),
    )
)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

class AlertStore:
    def __init__(self, path=DB_PATH, max_alerts=200):
        self.path = str(path)
        self.max_alerts = max_alerts
        with sqlite3.connect(self.path) as con:
            con.execute("""CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                event_id TEXT,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'New'
            )""")
            # Existing databases created before workflow statuses are upgraded safely.
            columns = {row[1] for row in con.execute("PRAGMA table_info(alerts)")}
            if "status" not in columns:
                con.execute("ALTER TABLE alerts ADD COLUMN status TEXT NOT NULL DEFAULT 'New'")
            con.execute("CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id, id DESC)")

    def add_if_anomalous(self, user_id: int, result: dict) -> None:
        if not isinstance(result, dict) or not result.get("is_anomaly", False):
            return
        with sqlite3.connect(self.path) as con:
            con.execute("INSERT INTO alerts(user_id,event_id,payload,status) VALUES(?,?,?,?)",
                        (user_id, result.get("event_id"), json.dumps(result), "New"))
            con.execute("""DELETE FROM alerts WHERE user_id=? AND id NOT IN
                (SELECT id FROM alerts WHERE user_id=? ORDER BY id DESC LIMIT ?)""",
                (user_id, user_id, self.max_alerts))

    def list_alerts(self, user_id: int, limit: int = 50) -> list[dict]:
        with sqlite3.connect(self.path) as con:
            rows = con.execute(
                "SELECT id,event_id,payload,created_at,status FROM alerts WHERE user_id=? ORDER BY id DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
        alerts = []
        for alert_id, event_id, payload, created_at, status in rows:
            item = json.loads(payload)
            item.update({"alert_id": alert_id, "event_id": event_id or item.get("event_id"),
                         "created_at": created_at, "status": status})
            alerts.append(item)
        return alerts

    def update_status(self, user_id: int, alert_id: int, status: str) -> bool:
        with sqlite3.connect(self.path) as con:
            cur = con.execute(
                "UPDATE alerts SET status=? WHERE id=? AND user_id=?",
                (status, alert_id, user_id),
            )
            return cur.rowcount == 1

alert_store = AlertStore()
