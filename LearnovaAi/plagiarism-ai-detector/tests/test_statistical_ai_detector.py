"""Unit tests for the Perplexity + Burstiness AI detector."""

import asyncio
from pathlib import Path
import sys

import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.ai_detector import AIDetectorService
from src.services.burstiness_service import BurstinessCalculator
from src.services.perplexity_service import PerplexityCalculator


class FakePerplexityCalculator:
    async def calculate_sentence_scores_async(self, sentences):
        assert len(sentences) == 3
        return [0.2, 0.9, 0.6]


class FakeBurstinessCalculator:
    async def calculate_sentence_scores_async(self, sentences):
        assert len(sentences) == 3
        return [0.4, 0.8, 0.2]


def test_perplexity_mapping_and_empty_input_are_safe():
    """Low PPL maps to a stronger AI signal and empty input never loads a model."""
    assert PerplexityCalculator._ppl_to_ai_score(20.0) > 0.8
    assert PerplexityCalculator._ppl_to_ai_score(100.0) < 0.1
    calculator = PerplexityCalculator.__new__(PerplexityCalculator)
    assert calculator.calculate_sentence_scores([]) == []


def test_burstiness_scores_are_aligned_and_regular_text_scores_higher():
    """Vectorized local windows return valid per-sentence scores."""
    calculator = BurstinessCalculator()
    regular = calculator.calculate_sentence_scores(["one two"] * 8)
    varied = calculator.calculate_sentence_scores([
        "one", "one two three four five six seven eight", "one two",
        "one two three four five", "one", "one two three four five six",
        "one two", "one two three four five six seven eight nine",
    ])
    assert len(regular) == len(varied) == 8
    assert all(0.0 <= score <= 1.0 for score in regular + varied)
    assert sum(regular) / len(regular) > sum(varied) / len(varied)


def test_service_uses_weighted_statistical_scores_and_threshold():
    """Service must use 0.65 PPL + 0.35 Burstiness for every sentence."""
    service = AIDetectorService(
        perplexity_calculator=FakePerplexityCalculator(),
        burstiness_calculator=FakeBurstinessCalculator(),
    )
    result = asyncio.run(service.analyze_document("One. Two. Three."))

    assert [item["ai_score"] for item in result["sentence_heatmap"]] == [0.27, 0.865, 0.46]
    assert result["overall_ai_score"] == pytest.approx(33.33)
    assert result["sentence_heatmap"][1]["is_ai"] is True
    assert result["detector"] == "perplexity_burstiness"
