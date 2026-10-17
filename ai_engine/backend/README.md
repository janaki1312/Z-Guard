
# Z-Guard Backend

## Purpose

The backend exposes REST endpoints for submitting operational telemetry,
running AI-assisted anomaly detection, and retrieving recent alerts.

## Requirements

- Python environment with the AI engine dependencies installed
- FastAPI
- Uvicorn
- A trained Z-Guard model in `ai_engine/artifacts/`

## Setup

From the project root, activate the Python environment and install:

    python -m pip install -r backend/requirements.txt
    python -m pip install -r ai_engine/requirements.txt

Generate and train the model if it does not already exist:

    cd ai_engine
    python generate_data.py
    python train_model.py
    cd ..

Start the backend from the project root:

    python -m uvicorn backend.main:app --reload

API documentation:

    http://127.0.0.1:8000/docs

## Endpoints

- GET /health
- POST /api/analyze
- GET /api/alerts

## Limitations

Alert history is held in memory and resets on restart.
The model currently uses synthetic development data.
Detection results support investigation; they do not establish root cause.