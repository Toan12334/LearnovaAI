import hashlib
from typing import List, Tuple, Set


class WinnowingDetector:
    """
    [GD1] Thuật toán Winnowing Fingerprinting dùng cho phát hiện đạo văn chính xác (Exact Match).
    """

    def __init__(self, k_gram_size: int = 25, window_size: int = 10):
        self.k = k_gram_size
        self.t = window_size

    def _hash_gram(self, gram: str) -> int:
        return int(hashlib.md5(gram.encode("utf-8")).hexdigest()[:8], 16)

    def extract_fingerprints(self, text: str) -> Set[int]:
        """Tạo tập hợp fingerprints từ văn bản."""
        cleaned = "".join(c.lower() for c in text if c.isalnum())
        if len(cleaned) < self.k:
            return set()

        # Tạo k-grams và hash
        hashes = [self._hash_gram(cleaned[i : i + self.k]) for i in range(len(cleaned) - self.k + 1)]
        
        fingerprints = set()
        for i in range(len(hashes) - self.t + 1):
            window = hashes[i : i + self.t]
            min_val = min(window)
            fingerprints.add(min_val)

        return fingerprints

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Tính hệ số Jaccard Similarity dựa trên tập fingerprint."""
        fp1 = self.extract_fingerprints(text1)
        fp2 = self.extract_fingerprints(text2)

        if not fp1 or not fp2:
            return 0.0

        intersection = fp1.intersection(fp2)
        union = fp1.union(fp2)
        return len(intersection) / len(union) if union else 0.0
