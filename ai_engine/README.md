
# Z-Guard AI Engine

## 1. Overview

Z-Guard is an AI-assisted operational anomaly detection prototype for critical transaction systems.

The AI Engine analyzes operational metrics such as:

- Response time
- Transaction error rate
- CPU utilization
- Transactions per minute

It identifies unusual operational patterns and returns structured results that the backend can use to generate alerts and display information on the dashboard.

The project uses simulated telemetry for development and demonstration when real operational data is unavailable.

## 2. Objectives

The AI Engine aims to:

1. Process operational telemetry consistently.
2. Detect unusual patterns using rules and machine learning.
3. Identify signals that triggered rule-based alerts.
4. Return an anomaly score and risk classification.
5. Provide structured results for backend integration.
6. Support testing and evaluation using labelled data.

The engine supports human investigation. It does not guarantee that failures will be predicted or prevented.

## 3. Architecture

The AI Engine follows this workflow:

Operational Data
        |
        v
Data Validation and Preprocessing
        |
        v
Rule-Based Baseline + ML Anomaly Detector
        |
        v
Anomaly Score and Detection Result
        |
        v
Backend API
        |
        v
Risk Alert and Explanation
        |
        v
Z-Guard Dashboard

AI/ML inference is intended to run on IBM LinuxONE Community Cloud.

## 4. Folder Structure

ai_engine/
    README.md
    requirements.txt
    config.py
    generate_data.py
    preprocess.py
    baseline.py
    train_model.py
    detector.py
    evaluate.py
    schemas.py
    tests/
        test_preprocess.py
        test_detector.py
    data/
        README.md
        .gitkeep
    artifacts/
        .gitkeep

## 5. Input Data Format

Each operational event contains the following features:

| Field | Description | Example |
|---|---|---:|
| response_time_ms | Transaction response time in milliseconds | 1800 |
| error_rate | Fraction of failed transactions, from 0 to 1 | 0.12 |
| cpu_usage_pct | CPU utilization percentage, from 0 to 100 | 91 |
| transactions_per_minute | Number of transactions per minute | 500 |

Labelled datasets may include an additional field:

- label = 0: normal event
- label = 1: anomalous event

These labels are used for evaluation and, where appropriate, dataset preparation.

All example values are illustrative.

## 6. Detection Strategy

The project uses two complementary approaches.

### Rule-Based Baseline

A transparent baseline checks whether metrics exceed configured thresholds.

This approach is easy to explain and provides a comparison for the ML detector.

### Machine Learning

A lightweight anomaly detection model, such as Isolation Forest, can identify unusual combinations of operational metrics.

The model's output is an anomaly indicator or score. The score must not be interpreted as a probability of system failure unless separately calibrated and validated.

## 7. Expected Detection Output

The detector should return a dictionary that can be serialized as JSON.

Example:

{
  "anomaly_score": 0.91,
  "is_anomaly": true,
  "risk_level": "high",
  "signals": [
    "high_response_latency",
    "elevated_error_rate"
  ],
  "model": "anomaly_detector"
}

This is an illustrative output, not a measured model result.

The final output fields must remain consistent with the backend integration contract.

## 8. Installation

Use the Python environment and package versions supported by the Datathon's LinuxONE labs.

Create and activate a virtual environment if the provided environment permits it.

### Linux

python3 -m venv .venv
source .venv/bin/activate

### Windows PowerShell

py -m venv .venv
.venv\Scripts\Activate.ps1

Install dependencies:

python -m pip install -r requirements.txt

If the Datathon provides a preconfigured Jupyter environment, follow its instructions instead of creating an unnecessary second environment.

## 9. Development Workflow

After the other Python files have been implemented, the intended workflow is:

1. Generate the synthetic dataset.
2. Inspect and validate the data.
3. Train the anomaly detection model.
4. Run predictions on sample events.
5. Evaluate on held-out labelled test data.
6. Run automated tests.
7. Execute inference on LinuxONE.
8. Integrate the detector with the backend API.

The exact commands will be documented once the implementation files are complete.

## 10. Evaluation

Evaluate the detector using labelled test data that was not used for training.

Where applicable, report:

- Precision
- Recall
- F1-score
- Confusion matrix
- False-positive rate
- Inference latency

Compare the ML detector with the rule-based baseline.

Synthetic-data performance does not establish real-world performance. Clearly state the dataset and limitations when reporting results.

## 11. IBM LinuxONE Requirement

The project is intended to demonstrate AI/ML inference on IBM LinuxONE Community Cloud.

The team must verify that the detector executes successfully in the provided environment and capture genuine evidence of execution.

Do not claim live integration with IBM Z production telemetry unless that integration has actually been implemented and authorized.

## 12. Limitations

- Development data may be synthetic.
- Thresholds require evaluation and tuning.
- An anomaly does not necessarily indicate a failure or security incident.
- The detector may produce false positives and false negatives.
- The actual root cause must be investigated by an operator.
- The prototype is not a production-grade monitoring platform.

## 13. Team Integration

Harthika owns the AI/ML module.

Maanas integrates the detector with the backend API.

Venkatesh builds the dashboard.

Janaki coordinates LinuxONE deployment and integration testing.

All team members should agree on the input and output schema before integration.

## 14. Project Goal

Build a testable AI-assisted anomaly detection module that identifies unusual operational behavior, returns understandable structured results, and runs on IBM LinuxONE Community Cloud.
