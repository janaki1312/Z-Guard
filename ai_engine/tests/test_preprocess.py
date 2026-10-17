
"""Tests for Z-Guard input validation and preprocessing."""

import sys
from pathlib import Path

import pytest

# Make the ai_engine directory importable when tests run from the project root.
AI_ENGINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ENGINE_DIR))

from preprocess import prepare_event, prepare_frame  # noqa: E402


VALID_EVENT = {
    "response_time_ms": 180,
    "error_rate": 0.01,
    "cpu_usage_pct": 35,
    "transactions_per_minute": 500,
}


def test_prepare_event_returns_one_row():
    result = prepare_event(VALID_EVENT)

    assert result.shape == (1, 4)
    assert list(result.columns) == [
        "response_time_ms",
        "error_rate",
        "cpu_usage_pct",
        "transactions_per_minute",
    ]


def test_prepare_event_accepts_valid_numeric_values():
    result = prepare_event(VALID_EVENT)

    assert result.iloc[0]["response_time_ms"] == 180
    assert result.iloc[0]["cpu_usage_pct"] == 35


def test_prepare_event_rejects_missing_field():
    event = VALID_EVENT.copy()
    del event["cpu_usage_pct"]

    with pytest.raises((ValueError, KeyError)):
        prepare_event(event)


@pytest.mark.parametrize(
    "field,value",
    [
        ("response_time_ms", -1),
        ("error_rate", -0.1),
        ("error_rate", 1.1),
        ("cpu_usage_pct", -1),
        ("cpu_usage_pct", 101),
        ("transactions_per_minute", -5),
    ],
)
def test_prepare_event_rejects_out_of_range_values(field, value):
    event = VALID_EVENT.copy()
    event[field] = value

    with pytest.raises((ValueError, TypeError)):
        prepare_event(event)


@pytest.mark.parametrize("bad_value", [float("nan"), float("inf"), float("-inf")])
def test_prepare_event_rejects_non_finite_values(bad_value):
    event = VALID_EVENT.copy()
    event["response_time_ms"] = bad_value

    with pytest.raises((ValueError, TypeError)):
        prepare_event(event)


def test_prepare_event_rejects_non_numeric_values():
    event = VALID_EVENT.copy()
    event["cpu_usage_pct"] = "high"

    with pytest.raises((ValueError, TypeError)):
        prepare_event(event)


def test_prepare_event_rejects_non_dictionary_input():
    with pytest.raises((ValueError, TypeError)):
        prepare_event(["not", "an", "event"])


def test_prepare_frame_rejects_empty_dataframe():
    import pandas as pd

    empty_df = pd.DataFrame(
        columns=[
            "response_time_ms",
            "error_rate",
            "cpu_usage_pct",
            "transactions_per_minute",
        ]
    )

    with pytest.raises((ValueError, TypeError)):
        prepare_frame(empty_df)
