import math
from typing import Dict, List
import re


class PerplexityCalculator:
    """
    [GD2] Tính toán Perplexity (Độ rối) và Burstiness (Độ biến thiên độ dài/cấu trúc câu).
    Văn bản do AI sinh ra thường có Perplexity thấp và Burstiness đều đặn, ít biến thiên.
    """

    @staticmethod
    def calculate_sentence_burstiness(text: str) -> float:
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
        if len(sentences) <= 1:
            return 0.0

        lengths = [len(s.split()) for s in sentences]
        mean_len = sum(lengths) / len(lengths)
        variance = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(variance)

        # Hệ số biến thiên (Coefficient of Variation)
        return std_dev / mean_len if mean_len > 0 else 0.0

    async def compute_metrics(self, text: str) -> Dict[str, float]:
        burstiness = self.calculate_sentence_burstiness(text)
        
        # Giả lập Perplexity dựa trên phân bố từ (có thể tích hợp GPT-2 / LLaMA tokenizer log-likelihood)
        pseudo_perplexity = 45.0 + (burstiness * 30.0)

        return {
            "perplexity": round(pseudo_perplexity, 2),
            "burstiness": round(burstiness, 4)
        }
