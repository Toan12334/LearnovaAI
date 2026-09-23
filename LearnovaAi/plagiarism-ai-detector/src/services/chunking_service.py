"""Sentence-aware chunking and heatmap aggregation for long documents."""

import re
from collections import defaultdict
from typing import Any, Dict, List, Sequence

from src.core.logging import logger


class SmartChunker:
    """Build token-bounded chunks while preserving sentence boundaries."""

    _SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+|\n+")

    def split_into_sentences(self, text: str) -> List[str]:
        """Split text on punctuation or line boundaries and discard empty pieces.

        Args:
            text: Source document.

        Returns:
            Ordered non-empty sentence strings.
        """
        if not text or not text.strip():
            return []
        return [part.strip() for part in self._SENTENCE_BOUNDARY.split(text.strip()) if part.strip()]

    @staticmethod
    def _token_ids(tokenizer: Any, text: str) -> List[Any]:
        """Get token ids without special tokens from common HuggingFace tokenizers."""
        if tokenizer is None:
            return text.split()
        encoded = tokenizer(text, add_special_tokens=False)
        ids = encoded["input_ids"] if isinstance(encoded, dict) else encoded.input_ids
        # Some tokenizer implementations return a batch-like single row.
        if hasattr(ids, "ndim") and ids.ndim > 1:
            return ids[0]
        return ids[0] if isinstance(ids, (list, tuple)) and ids and isinstance(ids[0], (list, tuple)) else ids

    def _truncate_sentence(self, tokenizer: Any, sentence: str, max_tokens: int) -> str:
        """Safely truncate one overlong sentence to the configured token budget."""
        token_ids = self._token_ids(tokenizer, sentence)[:max_tokens]
        if tokenizer is not None and hasattr(tokenizer, "decode"):
            return tokenizer.decode(token_ids, skip_special_tokens=True).strip()
        # Fallback keeps this service usable with minimal testing tokenizers.
        return sentence

    def chunk_text(
        self, text: str, tokenizer: Any = None, max_tokens: int = 500,
        overlap_sentences: int = 1,
    ) -> List[Dict[str, Any]]:
        """Create sentence-aware, token-bounded chunks with sentence overlap.

        Args:
            text: Source document.
            tokenizer: Optional tokenizer used to count tokens. When omitted,
                whitespace-delimited words are used for lightweight metadata.
            max_tokens: Maximum content tokens per chunk (normally 500).
            overlap_sentences: Number of trailing sentences repeated in next chunk.

        Returns:
            Chunk dictionaries containing text, source sentence indexes and text.

        Raises:
            ValueError: If token budget or overlap is invalid.
        """
        if max_tokens <= 0 or overlap_sentences < 0:
            raise ValueError("max_tokens must be positive and overlap_sentences cannot be negative")
        sentences = self.split_into_sentences(text)
        if not sentences:
            return []

        prepared: List[tuple[int, str, int]] = []
        for index, sentence in enumerate(sentences):
            token_count = len(self._token_ids(tokenizer, sentence))
            if token_count > max_tokens:
                logger.warning("Sentence %d exceeds %d tokens; truncating it.", index, max_tokens)
                sentence = self._truncate_sentence(tokenizer, sentence, max_tokens)
                token_count = len(self._token_ids(tokenizer, sentence))
            prepared.append((index, sentence, token_count))

        chunks: List[Dict[str, Any]] = []
        start = 0
        while start < len(prepared):
            end, used = start, 0
            while end < len(prepared) and used + prepared[end][2] <= max_tokens:
                used += prepared[end][2]
                end += 1
            # A tokenizer fallback might not shrink a long sentence; prevent a loop.
            if end == start:
                end += 1
            selected = prepared[start:end]
            chunks.append({
                "chunk_id": len(chunks),
                "text": " ".join(item[1] for item in selected),
                "sentence_indices": [item[0] for item in selected],
                "sentence_texts": [item[1] for item in selected],
            })
            if end == len(prepared):
                break
            next_start = max(start + 1, end - overlap_sentences)
            start = next_start
        return chunks


def aggregate_chunk_results(
    chunks: List[Dict[str, Any]], chunk_scores: List[float], total_sentences: int,
    ai_threshold: float = 0.5,
) -> Dict[str, Any]:
    """De-duplicate overlapping sentence scores and prepare heatmap data.

    Scores of a sentence repeated by overlap are averaged. ``sentence_texts`` is
    read from chunks produced by :class:`SmartChunker` to retain heatmap text.
    """
    if len(chunks) != len(chunk_scores):
        raise ValueError("chunks and chunk_scores must have the same length")
    if total_sentences < 0:
        raise ValueError("total_sentences cannot be negative")

    sentence_scores: Dict[int, List[float]] = defaultdict(list)
    sentence_texts: Dict[int, str] = {}
    details: List[Dict[str, Any]] = []
    for chunk, score in zip(chunks, chunk_scores):
        score = float(score)
        indices = chunk.get("sentence_indices", [])
        texts: Sequence[str] = chunk.get("sentence_texts", [])
        for position, sentence_index in enumerate(indices):
            sentence_scores[sentence_index].append(score)
            if position < len(texts):
                sentence_texts.setdefault(sentence_index, texts[position])
        details.append({**chunk, "ai_score": score, "is_ai": score >= ai_threshold})

    heatmap = []
    for sentence_index in range(total_sentences):
        values = sentence_scores.get(sentence_index, [])
        score = round(sum(values) / len(values), 4) if values else 0.0
        heatmap.append({
            "sentence_index": sentence_index,
            "text": sentence_texts.get(sentence_index, ""),
            "ai_score": score,
            "human_score": round(1.0 - score, 4),
            "is_ai": score >= ai_threshold,
        })
    ai_count = sum(item["is_ai"] for item in heatmap)
    overall = round((ai_count / total_sentences) * 100, 2) if total_sentences else 0.0
    return {
        "overall_ai_score": overall,
        "total_chunks": len(chunks),
        "chunks_detail": details,
        "sentence_heatmap": heatmap,
    }


def aggregate_sentence_scores(
    sentences: List[str], chunks: List[Dict[str, Any]], sentence_scores: List[float],
    ai_threshold: float = 0.5,
) -> Dict[str, Any]:
    """Build an exact sentence heatmap from direct RoBERTa sentence inference.

    Unlike :func:`aggregate_chunk_results`, this function does not project a
    single chunk score onto every sentence it contains. Chunks remain only as
    UI/grouping metadata and derive their score from their member sentences.

    Args:
        sentences: Source sentences in document order.
        chunks: Sentence-aware chunks generated by :class:`SmartChunker`.
        sentence_scores: One direct RoBERTa AI score per source sentence.
        ai_threshold: Decision threshold for an individual sentence.

    Returns:
        Chunk details and an independently scored sentence heatmap.

    Raises:
        ValueError: If source sentences and sentence scores are misaligned.
    """
    if len(sentences) != len(sentence_scores):
        raise ValueError("sentences and sentence_scores must have the same length")

    normalized_scores = [round(float(score), 4) for score in sentence_scores]
    heatmap = [
        {
            "sentence_index": index,
            "text": sentence,
            "ai_score": score,
            "human_score": round(1.0 - score, 4),
            "is_ai": score >= ai_threshold,
        }
        for index, (sentence, score) in enumerate(zip(sentences, normalized_scores))
    ]
    details: List[Dict[str, Any]] = []
    for chunk in chunks:
        indices = chunk.get("sentence_indices", [])
        scores = [normalized_scores[index] for index in indices if 0 <= index < len(normalized_scores)]
        chunk_score = round(sum(scores) / len(scores), 4) if scores else 0.0
        details.append({
            **chunk,
            "ai_score": chunk_score,
            "human_score": round(1.0 - chunk_score, 4),
            "is_ai": chunk_score >= ai_threshold,
        })
    return {
        "total_chunks": len(chunks),
        "chunks_detail": details,
        "sentence_heatmap": heatmap,
    }
