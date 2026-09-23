"""Tests that the AI endpoint exposes actual statistical-service results."""

import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.api.v1.endpoints import ai_detection
from src.models.request import AIDetectionRequest


class FakeDetectorService:
    """Avoid model loading while exercising endpoint-to-service mapping."""

    async def analyze_large_document(self, text: str):
        return {
            "overall_ai_score": 75.0,
            "flagged_sentence_ratio": 0.5,
            "ai_generated_percentage": 75.0,
            "human_written_percentage": 25.0,
            "ai_sentence_percentage": 50.0,
            "human_sentence_percentage": 50.0,
            "model_health": {"is_reliable": True, "status": "reliable"},
            "total_chunks": 2,
            "sentence_heatmap": [{
                "sentence_index": 0, "text": "A sufficiently long sample sentence.",
                "ai_score": 0.75, "human_score": 0.25, "is_ai": True,
            }],
        }


def test_endpoint_uses_statistical_service(monkeypatch):
    """The endpoint must not return its former hardcoded result."""
    monkeypatch.setattr(ai_detection, "get_ai_detector_service", lambda: FakeDetectorService())
    payload = AIDetectionRequest(text="This sample is deliberately longer than the required fifty characters.")

    request = SimpleNamespace(client=SimpleNamespace(host="test-client"))
    response = asyncio.run(ai_detection.detect_ai_generated_content(payload, request))

    assert response.ai_probability == 0.75
    assert response.statistical_score_percentage == 75.0
    assert response.is_ai_generated is True
    assert response.total_chunks == 2
    assert response.sentence_heatmap[0].ai_score == 0.75


def test_summary_levels_are_explanatory():
    """Score bands should produce distinguishable user-facing summaries."""
    assert "Rất cao" in ai_detection.generate_summary(80, True)
    assert "Trung bình" in ai_detection.generate_summary(50, True)
    assert "Rất thấp" in ai_detection.generate_summary(10, True)
    assert "Không thể kết luận" in ai_detection.generate_summary(100, False)
