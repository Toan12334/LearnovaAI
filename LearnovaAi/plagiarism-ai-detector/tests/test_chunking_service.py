"""Unit tests for sentence-aware large document chunking."""

from pathlib import Path
import sys

import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.chunking_service import SmartChunker, aggregate_chunk_results


class WhitespaceTokenizer:
    """Small deterministic tokenizer that models one token per whitespace word."""

    def __call__(self, text, add_special_tokens=False):
        return {"input_ids": text.split()}

    def decode(self, token_ids, skip_special_tokens=True):
        return " ".join(token_ids)


@pytest.fixture
def tokenizer():
    return WhitespaceTokenizer()


def test_long_sentence_is_safely_truncated(tokenizer):
    """A single sentence over the budget creates a bounded, usable chunk."""
    text = " ".join(f"word{i}" for i in range(12)) + "."
    chunks = SmartChunker().chunk_text(text, tokenizer, max_tokens=5)

    assert len(chunks) == 1
    assert chunks[0]["sentence_indices"] == [0]
    assert len(tokenizer(chunks[0]["text"])["input_ids"]) <= 5


def test_chunks_never_exceed_token_budget(tokenizer):
    """Consecutive sentences are packed only while they fit the budget."""
    text = "One two. Three four. Five six. Seven eight."
    chunks = SmartChunker().chunk_text(text, tokenizer, max_tokens=4, overlap_sentences=0)

    assert [chunk["sentence_indices"] for chunk in chunks] == [[0, 1], [2, 3]]
    assert all(len(tokenizer(chunk["text"])["input_ids"]) <= 4 for chunk in chunks)


def test_chunk_overlap_reuses_the_requested_trailing_sentence(tokenizer):
    """The first sentence of a new chunk is the requested prior context."""
    text = "One two. Three four. Five six. Seven eight."
    chunks = SmartChunker().chunk_text(text, tokenizer, max_tokens=4, overlap_sentences=1)

    assert [chunk["sentence_indices"] for chunk in chunks] == [[0, 1], [1, 2], [2, 3]]


def test_aggregation_averages_scores_in_overlap(tokenizer):
    """A duplicated sentence receives the mean score from both source chunks."""
    chunks = SmartChunker().chunk_text(
        "One two. Three four. Five six.", tokenizer, max_tokens=4, overlap_sentences=1
    )
    result = aggregate_chunk_results(chunks, [0.2, 0.8], total_sentences=3)

    assert result["sentence_heatmap"][1]["ai_score"] == 0.5
    assert result["overall_ai_score"] == pytest.approx(66.67)
