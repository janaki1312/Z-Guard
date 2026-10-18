# Z-Guard Backend v2 (authentication and persistence)

## What changed
- SQLite-backed user accounts and expiring bearer sessions.
- Passwords stored as salted scrypt hashes; raw passwords are never stored.
- Register/login/logout/current-user endpoints.
- `/api/analyze` and `/api/alerts` require a valid bearer token and alerts are scoped to the signed-in user.
- `/api/demo/overview` returns clearly labelled illustrative sample data and does not write to the real alert store.
- Alert history is persisted in `backend/zguard.sqlite3` instead of being held only in memory.

## Install
From the project root, with your virtual environment active:

    python -m pip install -r backend/requirements.txt
    python -m uvicorn backend.main:app --reload

The existing AI engine dependencies must also be installed as described in the original README.

## New endpoints
- `POST /api/auth/register` JSON `{"email":"you@example.com","password":"at-least-8-characters"}`
- `POST /api/auth/login` same JSON; returns `access_token` and `user`
- `POST /api/auth/logout` with `Authorization: Bearer <access_token>`
- `GET /api/auth/me` with bearer token
- `GET /api/demo/overview` public, read-only illustrative demo data
- `POST /api/analyze` requires bearer token
- `GET /api/alerts` requires bearer token

## Important integration note
The current dashboard frontend must be updated to:
1. show welcome/login/register/demo screens;
2. send the bearer token with protected API requests;
3. call logout, clear the client token, and switch to read-only demo mode;
4. restore the session and user-scoped alerts after login.

Until that frontend integration is installed, the existing dashboard will receive HTTP 401 from `/api/analyze` and `/api/alerts`. Do not replace the backend yet if you need the current unauthenticated dashboard to continue working unchanged. This archive is the backend half of the coordinated change.

## Security notes / production work
- Tokens expire after 7 days and logout revokes the current token.
- Use HTTPS in deployment.
- For a public production deployment, add rate limiting, email verification, password reset, stronger operational logging, and secure deployment configuration.
- Demo data is illustrative and must remain visibly labelled as demo.
