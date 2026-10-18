"""SQLite-backed user accounts and opaque bearer sessions."""
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(
    os.environ.get(
        "ZGUARD_DB_PATH",
        str(Path(__file__).resolve().parent / "zguard.sqlite3"),
    )
)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

class AuthStore:
    def __init__(self, path=DB_PATH):
        self.path = str(path)
        self._init_db()

    def _connect(self):
        con = sqlite3.connect(self.path, timeout=10)
        con.row_factory = sqlite3.Row
        return con

    def _init_db(self):
        with self._connect() as con:
            con.execute("""CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at INTEGER NOT NULL
            )""")
            con.execute("""CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )""")

    @staticmethod
    def _hash_password(password, salt):
        return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)

    def _new_session(self, con, user_id):
        token = secrets.token_urlsafe(40)
        now = int(time.time())
        con.execute("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
                    (hashlib.sha256(token.encode()).hexdigest(), user_id, now + 60*60*24*7, now))
        return token

    def register(self, email, password):
        email = email.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        salt = secrets.token_bytes(16)
        password_hash = self._hash_password(password, salt)
        try:
            with self._connect() as con:
                cur = con.execute("INSERT INTO users(email,password_salt,password_hash,created_at) VALUES(?,?,?,?)",
                                  (email, salt, password_hash, int(time.time())))
                user_id = cur.lastrowid
                token = self._new_session(con, user_id)
        except sqlite3.IntegrityError as exc:
            raise ValueError("An account with that email already exists.") from exc
        return {"id": user_id, "email": email}, token

    def login(self, email, password):
        with self._connect() as con:
            row = con.execute("SELECT * FROM users WHERE email=?", (email.strip().lower(),)).fetchone()
            if row is None:
                # Keep failure timing closer to a real password verification.
                self._hash_password(password, b"zguard-dummy-salt")
                return None
            candidate = self._hash_password(password, row["password_salt"])
            if not hmac.compare_digest(candidate, row["password_hash"]):
                return None
            token = self._new_session(con, row["id"])
            return {"id": row["id"], "email": row["email"]}, token

    def get_user_for_token(self, token):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = int(time.time())
        with self._connect() as con:
            row = con.execute("""SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id
                WHERE s.token_hash=? AND s.expires_at>?""", (token_hash, now)).fetchone()
            if row is None:
                con.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
                return None
            return {"id": row["id"], "email": row["email"]}

    def logout(self, token):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with self._connect() as con:
            con.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash,))

auth_store = AuthStore()
