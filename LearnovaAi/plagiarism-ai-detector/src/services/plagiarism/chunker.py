"""Smart Noise-aware paragraph chunking for Internet plagiarism detection."""

import math
import re
from typing import Any, Dict, List, Optional

try:
    from pyvi import ViTokenizer, ViPosTagger
except ImportError:
    ViTokenizer = None
    ViPosTagger = None


class InternetPlagiarismChunker:
    """Create searchable 60--100 word chunks with 1-sentence overlap and retain richest samples."""

    _BOUNDARY = re.compile(r"(?<=[.!?])\s+|\n+")
    _NOISE_HEADINGS = re.compile(
        r"^(mục lục|lời cảm ơn|tài liệu tham khảo|references|contents|danh mục|phụ lục|lời cam đoan|lời mở đầu)\b",
        re.IGNORECASE,
    )
    _NUMBER = re.compile(r"\b\d+(?:[.,]\d+)?(?:%|\b)")
    _WORD = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)

    def split_sentences(self, text: str) -> List[str]:
        """Split source text into non-empty sentence-like units."""
        if not text or not text.strip():
            return []
        return [item.strip() for item in self._BOUNDARY.split(text.strip()) if item.strip()]

    def is_noise_sentence(self, sentence: str) -> bool:
        """Check if a sentence is noise (header, TOC, references, or too short)."""
        clean = sentence.strip()
        if not clean:
            return True
        words = self._WORD.findall(clean)
        if len(words) < 15:
            return True
        if self._NOISE_HEADINGS.match(clean):
            return True
        return False

    def _calculate_complexity(self, text: str) -> float:
        """
        Rank complexity based on nouns, named entities, specialized terms, numbers,
        and vocabulary richness. Uses pyvi POS tagger when available.
        """
        words = self._WORD.findall(text)
        if not words:
            return 0.0

        noun_entity_count = 0
        if ViTokenizer and ViPosTagger:
            try:
                tokenized = ViTokenizer.tokenize(text)
                vi_words, vi_tags = ViPosTagger.postagging(tokenized)
                for w, tag in zip(vi_words, vi_tags):
                    # N: Noun, Np: Proper noun/Entity, Ny: Abbreviation, Nu: Unit, M: Numeral
                    if tag in {"Np", "N", "Ny", "Nu", "M"}:
                        noun_entity_count += 1
            except Exception:
                noun_entity_count = sum(word[:1].isupper() or len(word) >= 7 for word in words)
        else:
            noun_entity_count = sum(word[:1].isupper() or len(word) >= 7 for word in words)

        numbers_count = len(self._NUMBER.findall(text))
        long_terms = sum(len(word) >= 8 for word in words)
        unique_ratio = len({word.lower() for word in words}) / len(words)

        # Composite score
        return (
            noun_entity_count * 2.0
            + numbers_count * 2.5
            + long_terms * 1.5
            + unique_ratio * 4.0
        )

    def extract_searchable_chunks(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract and return the top 20%--30% most information-rich paragraph chunks.

        - Filters out noise: TOC, acknowledgements, references, and sentences < 15 words.
        - Chunks contain 60--100 words with 1-sentence overlap between adjacent chunks.
        - Ranks by complexity (nouns, entities, numbers, specialized terms) and selects top 20--30%.
        """
        sentences = self.split_sentences(text)
        accepted = [s for s in sentences if not self.is_noise_sentence(s)]
        if not accepted:
            return []

        candidates: List[Dict[str, Any]] = []
        index = 0
        while index < len(accepted):
            selected_sentences: List[str] = []
            word_count = 0

            # 1-sentence overlap from previous chunk
            if candidates:
                overlap_sentence = candidates[-1]["sentences"][-1]
                selected_sentences.append(overlap_sentence)
                word_count = len(self._WORD.findall(overlap_sentence))

            while index < len(accepted):
                sentence = accepted[index]
                sentence_words = len(self._WORD.findall(sentence))
                if selected_sentences and (word_count + sentence_words > 100):
                    break
                selected_sentences.append(sentence)
                word_count += sentence_words
                index += 1
                if word_count >= 60:
                    break

            if word_count >= 15:
                chunk_text = " ".join(selected_sentences)
                candidates.append({
                    "chunk_id": len(candidates),
                    "text": chunk_text,
                    "sentences": selected_sentences,
                    "word_count": word_count,
                    "complexity": self._calculate_complexity(chunk_text),
                })
            elif index < len(accepted):
                index += 1

        if not candidates:
            return []

        # Select top 20%--30% of chunks with highest complexity
        ratio = 0.30 if len(candidates) < 10 else 0.25
        selected_count = max(1, math.ceil(len(candidates) * ratio))
        ranked = sorted(candidates, key=lambda item: item["complexity"], reverse=True)[:selected_count]

        # Return sorted by original document chunk_id order
        return sorted(ranked, key=lambda item: item["chunk_id"])


chunker = InternetPlagiarismChunker()


def extract_searchable_chunks(text: str) -> List[Dict[str, Any]]:
    """Convenience functional wrapper for InternetPlagiarismChunker.extract_searchable_chunks."""
    return chunker.extract_searchable_chunks(text)
