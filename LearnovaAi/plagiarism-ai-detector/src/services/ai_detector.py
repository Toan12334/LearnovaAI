"""Statistical AI detector based on Perplexity and Burstiness only."""

import asyncio
from typing import Any, Dict, List, Optional

from src.core.config import settings
from src.core.logging import logger
from src.services.burstiness_service import BurstinessCalculator
from src.services.chunking_service import SmartChunker
from src.services.perplexity_service import PerplexityCalculator


class AIDetectorService:
    """Combine language predictability and sentence-rhythm signals.

    Percentages are a statistical AI-likeness signal, not proof of authorship.
    """

    def __init__(
        self,
        perplexity_calculator: Optional[PerplexityCalculator] = None,
        burstiness_calculator: Optional[BurstinessCalculator] = None,
        chunker: Optional[SmartChunker] = None,
    ) -> None:
        """Create components, loading only the lightweight PPL model once."""
        self.perplexity_calculator = perplexity_calculator or PerplexityCalculator()
        self.burstiness_calculator = burstiness_calculator or BurstinessCalculator()
        self.chunker = chunker or SmartChunker()

    @staticmethod
    def _chunk_details(chunks: List[Dict[str, Any]], sentence_scores: List[float]) -> List[Dict[str, Any]]:
        """Attach mean statistical scores to metadata chunks."""
        details: List[Dict[str, Any]] = []
        for chunk in chunks:
            indices = chunk.get("sentence_indices", [])
            scores = [sentence_scores[index] for index in indices if 0 <= index < len(sentence_scores)]
            score = round(sum(scores) / len(scores), 4) if scores else 0.0
            details.append({**chunk, "ai_score": score, "human_score": round(1.0 - score, 4),
                            "is_ai": score > settings.AI_DETECTOR_THRESHOLD})
        return details

    async def analyze_document(self, text: str) -> Dict[str, Any]:
        """Analyze short or large documents using only PPL and Burstiness."""
        try:
            sentences = self.chunker.split_into_sentences(text)
            if not sentences:
                return {
                    "overall_ai_score": 0.0, "ai_generated_percentage": 0.0,
                    "human_written_percentage": 100.0, "ai_sentence_percentage": 0.0,
                    "human_sentence_percentage": 100.0, "flagged_sentence_ratio": 0.0,
                    "total_chunks": 0, "chunks_detail": [], "sentence_heatmap": [],
                    "model_health": {"status": "no_content", "is_reliable": False,
                                     "warnings": ["No scorable sentences."]},
                    "detector": "perplexity_burstiness",
                }

            perplexity_scores, burstiness_scores = await asyncio.gather(
                self.perplexity_calculator.calculate_sentence_scores_async(sentences),
                self.burstiness_calculator.calculate_sentence_scores_async(sentences),
            )
            if len(perplexity_scores) != len(sentences) or len(burstiness_scores) != len(sentences):
                raise ValueError("Statistical calculators returned a misaligned score array")

            sentence_scores = [
                round((0.65 * float(ppl)) + (0.35 * float(burst)), 4)
                for ppl, burst in zip(perplexity_scores, burstiness_scores)
            ]
            heatmap = [{
                "sentence_index": index, "text": sentence, "ai_score": score,
                "human_score": round(1.0 - score, 4),
                "perplexity_score": round(float(perplexity_scores[index]), 4),
                "burstiness_score": round(float(burstiness_scores[index]), 4),
                "is_ai": score > settings.AI_DETECTOR_THRESHOLD,
            } for index, (sentence, score) in enumerate(zip(sentences, sentence_scores))]
            ai_count = sum(item["is_ai"] for item in heatmap)
            ratio = ai_count / len(sentences)
            overall = round(ratio * 100.0, 2)
            chunks = self.chunker.chunk_text(text, max_tokens=500, overlap_sentences=2)
            return {
                "overall_ai_score": overall, "ai_generated_percentage": overall,
                "human_written_percentage": round(100.0 - overall, 2),
                "ai_sentence_percentage": overall, "human_sentence_percentage": round(100.0 - overall, 2),
                "flagged_sentence_ratio": round(ratio, 4), "total_chunks": len(chunks),
                "chunks_detail": self._chunk_details(chunks, sentence_scores),
                "sentence_heatmap": heatmap,
                "model_health": {"status": "statistical", "is_reliable": True,
                                 "warnings": ["Scores are statistical signals, not authorship proof."]},
                "detector": "perplexity_burstiness",
            }
        except Exception as exc:
            logger.error("Lỗi khi phân tích thống kê tài liệu: %s", exc, exc_info=True)
            raise

    async def analyze_large_document(self, text: str, batch_size: int = 16) -> Dict[str, Any]:
        """Backward-compatible alias for :meth:`analyze_document`."""
        del batch_size
        return await self.analyze_document(text)
