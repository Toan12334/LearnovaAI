"""Vietnamese-aware Entity Extraction and Dual Query Generation."""

import re
from typing import Any, Dict, List, Tuple

try:
    from pyvi import ViTokenizer, ViPosTagger
except ImportError:
    ViTokenizer = None
    ViPosTagger = None

try:
    import underthesea
except ImportError:
    underthesea = None


class DualQueryBuilder:
    """Extract entities and generate Exact Match and Entity/Paraphrase Match queries per chunk."""

    _WORD = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)
    _NUMBER = re.compile(r"\b\d+(?:[.,]\d+)?(?:%|\b)")
    _STOP_WORDS = {
        "và", "là", "của", "cho", "trong", "với", "những", "các", "một", "được",
        "có", "đến", "này", "đã", "khi", "sẽ", "từ", "để", "như", "thì", "về",
        "ở", "theo", "ra", "lại", "do", "bởi", "lên", "người", "nhau", "cùng",
        "the", "and", "for", "with", "that", "this", "from", "which", "are",
    }

    def extract_entities_and_nouns(self, text: str) -> List[str]:
        """
        Extract named entities (NER), nouns, specialized terms, and numbers using pyvi / underthesea.
        """
        entities: List[str] = []

        # 1. Try pyvi POS tagging
        if ViTokenizer and ViPosTagger:
            try:
                tokenized = ViTokenizer.tokenize(text)
                words, tags = ViPosTagger.postagging(tokenized)
                for w, tag in zip(words, tags):
                    clean_word = w.replace("_", " ").strip()
                    if not clean_word or clean_word.lower() in self._STOP_WORDS:
                        continue
                    if tag in {"Np", "N", "Nc", "Ny", "Nu", "M"}:
                        if len(clean_word) >= 3 or tag in {"Np", "Ny", "M"}:
                            entities.append(clean_word)
            except Exception:
                pass

        # 2. Try underthesea if available and pyvi found little
        if not entities and underthesea:
            try:
                tagged = underthesea.pos_tag(text)
                for w, tag in tagged:
                    clean_word = w.strip()
                    if not clean_word or clean_word.lower() in self._STOP_WORDS:
                        continue
                    if tag.startswith("N") or tag == "M":
                        entities.append(clean_word)
            except Exception:
                pass

        # 3. Fallback regex extraction if NLP models unavailable
        if not entities:
            raw_tokens = self._WORD.findall(text)
            for token in raw_tokens:
                if token.lower() not in self._STOP_WORDS and (len(token) >= 5 or token[:1].isupper()):
                    entities.append(token)
            for num in self._NUMBER.findall(text):
                entities.append(num)

        # De-duplicate while preserving order
        unique_entities: List[str] = []
        seen = set()
        for item in entities:
            lower = item.lower()
            if lower not in seen:
                seen.add(lower)
                unique_entities.append(item)

        return unique_entities

    def _build_exact_query(self, text: str) -> str:
        """
        Query 1 (Exact Match): Select the most distinctive consecutive 6-8 word phrase in quotes.
        """
        words = self._WORD.findall(text)
        if not words:
            return ""

        # Remove pure punctuation or edge whitespace
        window_size = min(8, max(6, len(words)))
        if len(words) <= window_size:
            return f'\"{" ".join(words)}\"'

        # Sliding window to find the most distinctive phrase (high average length, capitalized terms, numbers)
        best_phrase = words[:window_size]
        best_score = -1.0

        for i in range(len(words) - window_size + 1):
            window = words[i:i + window_size]
            score = sum(
                (2.0 if w[:1].isupper() else 0.0)
                + (2.5 if any(c.isdigit() for c in w) else 0.0)
                + (1.5 if len(w) >= 6 else 0.0)
                - (1.0 if w.lower() in self._STOP_WORDS else 0.0)
                for w in window
            )
            if score > best_score:
                best_score = score
                best_phrase = window

        return f'\"{" ".join(best_phrase)}\"'

    def _build_entity_query(self, text: str) -> str:
        """
        Query 2 (Entity Match - Paraphrase): Combine 3-4 nouns/entities with AND operator.
        """
        entities = self.extract_entities_and_nouns(text)
        # Select 3-4 most prominent entities
        selected = entities[:4]
        if len(selected) >= 2:
            return " AND ".join(f'\"{term}\"' for term in selected)
        return ""

    def build_queries(self, chunk: Dict[str, Any]) -> List[str]:
        """
        Generate Dual Queries for a chunk:
        - Query 1: Exact Match (6--8 consecutive words in quotes)
        - Query 2: Entity Match (3--4 entities combined with AND)
        """
        text = chunk.get("text", "")
        if not text:
            return []

        exact_query = self._build_exact_query(text)
        entity_query = self._build_entity_query(text)

        queries: List[str] = []
        if exact_query:
            queries.append(exact_query)
        if entity_query and entity_query != exact_query:
            queries.append(entity_query)

        return queries


query_builder = DualQueryBuilder()
