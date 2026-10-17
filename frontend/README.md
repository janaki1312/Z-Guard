# Z-Guard Frontend

Z-Guard is a cybersecurity monitoring dashboard built with React and Vite. It connects to a FastAPI backend to analyze operational events and display anomaly detection results.

## Features

- Dark cybersecurity-themed dashboard
- Backend health monitoring
- AI model status display
- Operational event analysis
- Anomaly detection results and risk levels
- Recent alerts with search functionality
- Responsive dashboard layout
- Lucide icons

## Technology Stack

- React
- Vite
- JavaScript
- CSS
- Lucide React
- FastAPI backend

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Python
- Backend and AI engine dependencies

## Run the Frontend

Open a terminal in the project root and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Run the Backend

Open a separate terminal in the project root:

```powershell
python -m pip install -r .\ai_engine\requirements.txt
python -m pip install -r .\backend\requirements.txt
python .\ai_engine\generate_data.py
python .\ai_engine\train_model.py
python -m uvicorn main:app --app-dir backend --reload
```

The FastAPI backend normally runs at `http://127.0.0.1:8000`.

API documentation is available at `http://127.0.0.1:8000/docs`.

## Project Structure

- `frontend/` — React dashboard and styling
- `backend/` — FastAPI endpoints and alert handling
- `ai_engine/` — Data generation, model training, evaluation, and anomaly detection

## Development

Vite provides a development server with Hot Module Replacement (HMR), allowing frontend changes to appear in the browser during development.

## Important Note

The project uses synthetic operational data for development and testing. Model performance on synthetic data does not establish performance on real-world operational telemetry.
