"""Vectorized local burstiness scoring for statistical AI detection."""

import asyncio
from typing import List

import numpy as np


class BurstinessCalculator:
    """Measure local sentence-length regularity as an AI-likelihood signal."""

    def calculate_sentence_scores(self, sentences: List[str], window_size: int = 5) -> List[float]:
        """Return one local regularity score in ``[0, 1]`` for each sentence.

        A small local standard deviation means unusually uniform sentence
        lengths and therefore a higher AI signal. Edges use replicated values
        so the output is aligned one-to-one with the input sentences.
        """
        if window_size <= 0:
            raise ValueError("window_size must be greater than zero")
        if not sentences:
            return []
        lengths = np.asarray([len(sentence.split()) for sentence in sentences], dtype=float)
        if len(lengths) == 1:
            return [0.5]

        left = window_size // 2
        right = window_size - 1 - left
        padded = np.pad(lengths, (left, right), mode="edge")
        windows = np.lib.stride_tricks.sliding_window_view(padded, window_size)
        local_std = windows.std(axis=1)
        # Smooth monotonic normalization: std=0 -> 1.0, std=5 -> 0.5.
        scores = 1.0 / (1.0 + (local_std / 5.0))
        return np.round(np.clip(scores, 0.0, 1.0), 4).tolist()

    async def calculate_sentence_scores_async(
        self, sentences: List[str], window_size: int = 5,
    ) -> List[float]:
        """Run vectorized computation without blocking the async event loop."""
        return await asyncio.to_thread(self.calculate_sentence_scores, sentences, window_size)
