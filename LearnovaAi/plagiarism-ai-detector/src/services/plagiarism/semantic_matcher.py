"""BGE-M3 Semantic Re-ranker and Cosine Matcher for Exact and Paraphrased Plagiarism."""

import asyncio
import re
from typing import Any, Dict, List, Tuple

import numpy as np

from src.core.config import settings
from src.services.embedding import embedding_service


class SemanticMatcher:
    """Encode BGE-M3 vectors and classify exact versus paraphrased Internet matches."""

    _BOUNDARY = re.compile(r"(?<=[.!?])\s+|\n+")

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """Split web page text into distinct sentence candidates with sufficient semantic content."""
        if not text or not text.strip():
            return []
        return [
            item.strip()
            for item in SemanticMatcher._BOUNDARY.split(text.strip())
            if len(item.split()) >= 6
        ]

    @staticmethod
    def cosine(left: List[float], right: List[float]) -> float:
        """Calculate cosine similarity safely using numpy."""
        left_arr = np.asarray(left, dtype=np.float32)
        right_arr = np.asarray(right, dtype=np.float32)
        norm_l = np.linalg.norm(left_arr)
        norm_r = np.linalg.norm(right_arr)
        if norm_l == 0.0 or norm_r == 0.0:
            return 0.0
        return float(np.dot(left_arr, right_arr) / (norm_l * norm_r))

    async def encode(self, texts: List[str]) -> List[List[float]]:
        """Encode texts to BGE-M3 vectors in a background thread to prevent blocking FastAPI."""
        if not texts:
            return []
        return await asyncio.to_thread(embedding_service.embed_texts, texts)

    async def find_matches(
        self,
        chunks: List[Dict[str, Any]],
        pages: Dict[str, str],
        exact_threshold: float = 0.90,
        paraphrase_threshold: float = 0.78,
    ) -> List[Dict[str, Any]]:
        """
        Match each user chunk against all candidate sentences from scraped Web pages.

        Rules:
        - If Similarity >= 0.90: Marked as 'EXACT' (Đạo văn nguyên văn).
        - If 0.78 <= Similarity < 0.90: Marked as 'PARAPHRASED' (Đạo văn diễn đạt lại).
        - If Similarity < 0.78: Ignored.
        """
        if not chunks or not pages:
            return []

        # Extract all candidate sentences across all pages
        candidates: List[Tuple[str, str]] = []
        for url, content in pages.items():
            for sentence in self.split_sentences(content):
                candidates.append((url, sentence))

        if not candidates:
            return []

        user_texts = [chunk["text"] for chunk in chunks]
        candidate_texts = [sentence for _, sentence in candidates]

        # Batch encode user chunks and candidate sentences
        user_vectors, candidate_vectors = await asyncio.gather(
            self.encode(user_texts),
            self.encode(candidate_texts),
        )

        matches: List[Dict[str, Any]] = []

        for chunk, user_vec in zip(chunks, user_vectors):
            best_match: Dict[str, Any] = None

            for (url, text), cand_vec in zip(candidates, candidate_vectors):
                sim = self.cosine(user_vec, cand_vec)

                # Ignore below paraphrase threshold
                if sim < paraphrase_threshold:
                    continue

                match_type = "EXACT" if sim >= exact_threshold else "PARAPHRASED"

                if best_match is None or sim > best_match["similarity_score"]:
                    best_match = {
                        "user_text": chunk["text"],
                        "matched_text": text,
                        "similarity_score": round(sim, 4),
                        "type": match_type,
                        "source_url": url,
                        "chunk_id": chunk.get("chunk_id", 0),
                    }

            if best_match is not None:
                matches.append(best_match)

        return matches


semantic_matcher = SemanticMatcher()
