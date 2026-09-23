"""Per-sentence perplexity scoring for statistical AI detection."""

import asyncio
import math
from typing import List, Optional

import torch
import torch.nn.functional as functional
from transformers import AutoModelForCausalLM, AutoTokenizer

from src.core.config import settings
from src.core.logging import logger


class PerplexityCalculator:
    """Calculate an AI-likelihood score from causal-language-model perplexity.

    Lower perplexity means the language model found a sentence more predictable;
    it is a signal only, not proof that a person or a model wrote the text.
    """

    def __init__(self, model_name: Optional[str] = None, device: Optional[str] = None) -> None:
        """Load the lightweight causal language model once per process.

        Args:
            model_name: Hugging Face causal-LM name; defaults to ``distilgpt2``.
            device: ``cpu`` or ``cuda``; automatic selection when omitted.
        """
        self.model_name = model_name or settings.PERPLEXITY_MODEL
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
        except Exception as exc:
            logger.error("Không thể nạp mô hình Perplexity '%s': %s", self.model_name, exc, exc_info=True)
            raise RuntimeError(f"Không thể khởi tạo PerplexityCalculator: {exc}") from exc

    @staticmethod
    def _ppl_to_ai_score(perplexity: float) -> float:
        """Map PPL to AI signal: PPL 20 is high signal, PPL 100 is low."""
        bounded = min(max(float(perplexity), 1.0), 1_000.0)
        score = 1.0 / (1.0 + math.exp((bounded - 50.0) / 15.0))
        return round(float(score), 4)

    def calculate_sentence_scores(self, sentences: List[str], batch_size: int = 16) -> List[float]:
        """Return one normalized perplexity AI score per input sentence.

        Whitespace-only and one-token sentences return neutral ``0.5`` because
        next-token cross entropy is undefined or statistically meaningless.
        """
        if batch_size <= 0:
            raise ValueError("batch_size must be greater than zero")
        if not sentences:
            return []

        scores = [0.5] * len(sentences)
        valid = [(index, text.strip()) for index, text in enumerate(sentences) if text and text.strip()]
        try:
            for start in range(0, len(valid), batch_size):
                batch = valid[start:start + batch_size]
                texts = [text for _, text in batch]
                encoded = self.tokenizer(
                    texts, return_tensors="pt", padding=True, truncation=True, max_length=256,
                )
                input_ids = encoded["input_ids"].to(self.device)
                attention_mask = encoded["attention_mask"].to(self.device)
                if input_ids.shape[1] < 2:
                    continue
                with torch.no_grad():
                    logits = self.model(input_ids=input_ids, attention_mask=attention_mask).logits
                token_loss = functional.cross_entropy(
                    logits[:, :-1, :].transpose(1, 2), input_ids[:, 1:], reduction="none",
                )
                token_mask = attention_mask[:, 1:].float()
                lengths = token_mask.sum(dim=1)
                losses = (token_loss * token_mask).sum(dim=1) / lengths.clamp_min(1.0)
                for (index, _), loss, length in zip(batch, losses, lengths):
                    if float(length.item()) > 0:
                        perplexity = math.exp(min(float(loss.item()), 20.0))
                        scores[index] = self._ppl_to_ai_score(perplexity)
            return scores
        except Exception as exc:
            logger.error("Lỗi khi tính perplexity theo batch: %s", exc, exc_info=True)
            raise

    async def calculate_sentence_scores_async(
        self, sentences: List[str], batch_size: int = 16,
    ) -> List[float]:
        """Run perplexity scoring off the FastAPI event loop."""
        return await asyncio.to_thread(self.calculate_sentence_scores, sentences, batch_size)
