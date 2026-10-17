# Z-Guard

Z-Guard is an anomaly-detection prototype for identifying unusual operational events using machine learning and rule-based checks.

## Project Structure

- `ai_engine/` — Data generation, preprocessing, model training, evaluation, and tests.
- `backend/` — FastAPI service exposing health, analysis, and alert endpoints.
- `frontend/` — Planned dashboard location.

## AI Engine Setup

Install dependencies:

```powershell
python -m pip install -r .\ai_engine\requirements.txt
```

Generate synthetic data:

```powershell
python .\ai_engine\generate_data.py
```

Train the model:

```powershell
python .\ai_engine\train_model.py
```

Run tests:

```powershell
python -m pytest .\ai_engine\tests -v
```

Evaluate the model:

```powershell
python .\ai_engine\evaluate.py
```

## Backend Setup

Install backend dependencies:

```powershell
python -m pip install -r .\backend\requirements.txt
```

Start the API from the project root:

```powershell
python -m uvicorn main:app --app-dir backend --reload
```

Open `http://127.0.0.1:8000/docs` to inspect the API.

## Limitations

The model is evaluated on synthetic data. Its metrics do not establish performance on real operational telemetry. A trained model and generated datasets must be created locally before model-backed predictions can run.s