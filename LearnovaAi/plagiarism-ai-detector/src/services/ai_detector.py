"""AI detector service based on fine-tuned PhoBERT model (toanoppa10012004/phobert-vietnamese-ai-detector)."""

import asyncio
import os
import sys
from typing import Any, Dict, List, Optional

import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer


from src.core.config import settings
from src.core.logging import logger
from src.services.burstiness_service import BurstinessCalculator
from src.services.chunking_service import SmartChunker
from src.services.perplexity_service import PerplexityCalculator
from src.utils.text_cleaner import TextCleaner

try:
    from pyvi import ViTokenizer
except ImportError:
    ViTokenizer = None

# Đảm bảo HF_TOKEN được set ở cấp process-level để tránh unauthenticated requests
_HF_TOKEN = settings.HF_TOKEN or settings.HUGGINGFACE_API_KEY
if _HF_TOKEN:
    os.environ.setdefault("HF_TOKEN", _HF_TOKEN)
    os.environ.setdefault("HUGGINGFACE_TOKEN", _HF_TOKEN)
    try:
        from huggingface_hub import login as hf_login
        hf_login(token=_HF_TOKEN, add_to_git_credential=False)
        logger.info("Đã xác thực Hugging Face Hub thành công với HF_TOKEN.")
    except Exception as _hf_exc:
        logger.warning("Không thể đăng nhập HF Hub: %s", _hf_exc)


class AIDetectorService:
    """AI Detection service powered by fine-tuned PhoBERT Hugging Face model."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        token: Optional[str] = None,
        device: Optional[str] = None,
        chunker: Optional[SmartChunker] = None,
        perplexity_calculator: Optional[Any] = None,
        burstiness_calculator: Optional[Any] = None,
        use_hf_model: Optional[bool] = None,
    ) -> None:
        """Initialize PhoBERT AI detector with HF token authentication and fallback support."""
        self.model_name = model_name or settings.AI_DETECTOR_MODEL
        self.token = token or settings.HF_TOKEN or settings.HUGGINGFACE_API_KEY
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.chunker = chunker or SmartChunker()
        self.perplexity_calculator = perplexity_calculator or PerplexityCalculator()
        self.burstiness_calculator = burstiness_calculator or BurstinessCalculator()

        self.tokenizer = None
        self.model = None
        self.use_hf_model = False

        if use_hf_model is False:
            return

        self._try_load_hf_model()

    def _try_load_hf_model(self) -> None:
        if self.use_hf_model and self.model is not None and self.tokenizer is not None:
            return
        try:
            logger.info("Đang nạp mô hình Hugging Face PhoBERT AI Detector: %s", self.model_name)
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, token=self.token)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name, token=self.token)
            self.model.to(self.device)
            self.model.eval()
            self.use_hf_model = True
            logger.info("Đã nạp thành công mô hình PhoBERT AI Detector (%s)", self.device)
        except Exception as exc:
            logger.error(
                "[AI DETECTOR] KHÔNG THỂ nạp mô hình HF PhoBERT '%s': %s.\n"
                ">>> Hệ thống sẽ dùng phương pháp thống kê dự phòng (perplexity/burstiness).\n"
                ">>> ĐÂY LÀ NGUYÊN NHÂN KHIẾN TỶ LỆ % AI PHÁT HIỆN BỊ TỤT THẤP!\n"
                ">>> Kiểm tra: kết nối mạng, HF_TOKEN hợp lệ, tên model đúng.",
                self.model_name,
                exc,
                exc_info=True,
            )
            self.use_hf_model = False

    @staticmethod
    def _chunk_details(chunks: List[Dict[str, Any]], sentence_scores: List[float]) -> List[Dict[str, Any]]:
        """Attach mean scores to metadata chunks."""
        details: List[Dict[str, Any]] = []
        for chunk in chunks:
            indices = chunk.get("sentence_indices", [])
            scores = [sentence_scores[index] for index in indices if 0 <= index < len(sentence_scores)]
            score = round(sum(scores) / len(scores), 4) if scores else 0.0
            details.append({
                **chunk,
                "ai_score": score,
                "human_score": round(1.0 - score, 4),
                "is_ai": score >= settings.AI_DETECTOR_THRESHOLD,
            })
        return details

    def _group_into_passages(self, sentences: List[str], group_size: int = 3) -> List[Dict[str, Any]]:
        """Group 2-3 adjacent sentences into coherent passage blocks for contextual inference."""
        passages = []
        for i in range(0, len(sentences), group_size):
            group = sentences[i:i + group_size]
            text = " ".join(group)
            passages.append({
                "passage_index": len(passages),
                "start_sentence_index": i,
                "end_sentence_index": i + len(group) - 1,
                "sentence_count": len(group),
                "text": text,
            })
        return passages

    def _tokenize(self, texts: List[str]) -> List[str]:
        """Optional ViTokenizer segmentation for all texts."""
        segmented = []
        for text in texts:
            if ViTokenizer and text.strip():
                try:
                    segmented.append(ViTokenizer.tokenize(text.strip()))
                except Exception:
                    segmented.append(text.strip())
            else:
                segmented.append(text.strip())
        return segmented

    def _predict_batch_local(self, texts: List[str]) -> List[Dict[str, float]]:
        """Direct torch inference (local dev, no ZeroGPU)."""
        results: List[Dict[str, float]] = []
        encoded = self.tokenizer(
            texts, return_tensors="pt", padding=True, truncation=True, max_length=256
        )
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            probs = F.softmax(outputs.logits, dim=-1)
        for i in range(len(texts)):
            results.append({
                "ai_score": round(float(probs[i, 1].item()), 4),
                "human_score": round(float(probs[i, 0].item()), 4),
            })
        return results

    def _predict_text_hf(self, text: str) -> Dict[str, float]:
        """Run sequence classification inference on a single text."""
        if not text or not text.strip() or not self.model or not self.tokenizer:
            return {"ai_score": 0.0, "human_score": 1.0}
        segmented = self._tokenize([text.strip()])
        preds = self._predict_batch_local(segmented)
        return preds[0] if preds else {"ai_score": 0.0, "human_score": 1.0}

    def _predict_document_hf(self, text: str) -> Dict[str, float]:
        """Predict document-level AI/Human probabilities (chunking long text if > 180 words)."""
        if not text or not text.strip():
            return {"ai_score": 0.0, "human_score": 1.0}
        words = text.strip().split()
        if len(words) <= 180:
            return self._predict_text_hf(text)
        chunks = self.chunker.chunk_text(text, max_tokens=180, overlap_sentences=1)
        chunk_texts = [c["text"] for c in chunks] if chunks else [text]
        chunk_preds = [self._predict_text_hf(t) for t in chunk_texts]
        avg_ai = sum(p["ai_score"] for p in chunk_preds) / len(chunk_preds)
        avg_human = sum(p["human_score"] for p in chunk_preds) / len(chunk_preds)
        return {
            "ai_score": round(avg_ai, 4),
            "human_score": round(avg_human, 4),
        }

    def _predict_sentences_hf(self, sentences: List[str], batch_size: int = 16) -> List[Dict[str, float]]:
        """Run batch inference on PhoBERT classification model for passages/sentences."""
        results: List[Dict[str, float]] = []
        if not sentences or not self.model or not self.tokenizer:
            return results
        segmented = self._tokenize(sentences)
        for start in range(0, len(segmented), batch_size):
            batch_texts = segmented[start:start + batch_size]
            batch_preds = self._predict_batch_local(batch_texts)
            results.extend(batch_preds)
        return results

    async def analyze_document(self, text: str) -> Dict[str, Any]:
        """Analyze document using PhoBERT model with 2-3 sentence passage grouping for context-rich heatmap."""
        try:
            text = TextCleaner.clean_extracted_document_text(text)
            sentences = self.chunker.split_into_sentences(text)

            if not sentences:
                return {
                    "overall_ai_score": 0.0,
                    "ai_generated_percentage": 0.0,
                    "human_written_percentage": 100.0,
                    "ai_sentence_percentage": 0.0,
                    "human_sentence_percentage": 100.0,
                    "flagged_sentence_ratio": 0.0,
                    "total_chunks": 0,
                    "chunks_detail": [],
                    "sentence_heatmap": [],
                    "model_health": {
                        "status": "no_content",
                        "is_reliable": False,
                        "warnings": ["Không có câu nào để phân tích."],
                    },
                    "detector": "phobert_vietnamese_ai_detector" if self.use_hf_model else "perplexity_burstiness",
                }

            if not self.use_hf_model:
                self._try_load_hf_model()

            if self.use_hf_model:
                # 1. Full document / paragraph inference
                doc_pred = await asyncio.to_thread(self._predict_document_hf, text)
                doc_ai_score = doc_pred["ai_score"]

                # 2. Passage-level (2-3 sentences grouped) inference for heatmap
                passages = self._group_into_passages(sentences, group_size=3)
                passage_texts = [p["text"] for p in passages]
                passage_preds = await asyncio.to_thread(self._predict_sentences_hf, passage_texts)
                sentence_scores = [0.0] * len(sentences)
                for p, item in zip(passages, passage_preds):
                    for s_idx in range(p["start_sentence_index"], p["end_sentence_index"] + 1):
                        if s_idx < len(sentence_scores):
                            sentence_scores[s_idx] = item["ai_score"]

                heatmap = [
                    {
                        "sentence_index": p["passage_index"],
                        "text": p["text"],
                        "ai_score": item["ai_score"],
                        "human_score": item["human_score"],
                        "is_ai": item["ai_score"] >= settings.AI_DETECTOR_THRESHOLD,
                        "sentence_range": f"Câu {p['start_sentence_index'] + 1} - {p['end_sentence_index'] + 1}" if p['start_sentence_index'] != p['end_sentence_index'] else f"Câu {p['start_sentence_index'] + 1}",
                    }
                    for p, item in zip(passages, passage_preds)
                ]

                # 3. Điểm tổng thể khớp 100% với suy luận Colab trên toàn bộ văn bản
                overall_pct = round(doc_ai_score * 100.0, 2)

                detector_type = "phobert_vietnamese_ai_detector"
                model_status = "phobert_hf"
                overall = overall_pct
            else:





                # Statistical fallback if HF model is not loaded
                perplexity_scores, burstiness_scores = await asyncio.gather(
                    self.perplexity_calculator.calculate_sentence_scores_async(sentences),
                    self.burstiness_calculator.calculate_sentence_scores_async(sentences),
                )
                sentence_scores = [
                    round((0.65 * float(ppl)) + (0.35 * float(burst)), 4)
                    for ppl, burst in zip(perplexity_scores, burstiness_scores)
                ]
                heatmap = [
                    {
                        "sentence_index": index,
                        "text": sentence,
                        "ai_score": score,
                        "human_score": round(1.0 - score, 4),
                        "perplexity_score": round(float(perplexity_scores[index]), 4),
                        "burstiness_score": round(float(burstiness_scores[index]), 4),
                        "is_ai": score >= settings.AI_DETECTOR_THRESHOLD,
                    }
                    for index, (sentence, score) in enumerate(zip(sentences, sentence_scores))
                ]
                detector_type = "perplexity_burstiness"
                model_status = "statistical_fallback"
                total_sent = len(sentences)
                avg_ai_score = (sum(sentence_scores) / total_sent) if total_sent > 0 else 0.0
                overall = round(avg_ai_score * 100.0, 2)

            total_sent = len(sentences)
            ai_count = sum(1 for item in heatmap if item["is_ai"])
            ratio = ai_count / len(heatmap) if heatmap else 0.0

            chunks = self.chunker.chunk_text(text, max_tokens=500, overlap_sentences=2)
            ai_sentence_pct = round(ratio * 100.0, 2)

            return {
                "overall_ai_score": overall,
                "ai_generated_percentage": overall,
                "human_written_percentage": round(100.0 - overall, 2),
                "ai_sentence_percentage": ai_sentence_pct,
                "human_sentence_percentage": round(100.0 - ai_sentence_pct, 2),
                "flagged_sentence_ratio": round(ratio, 4),
                "total_chunks": len(chunks),
                "chunks_detail": self._chunk_details(chunks, sentence_scores),
                "sentence_heatmap": heatmap,
                "model_health": {
                    "status": model_status,
                    "is_reliable": True,
                    "model_name": self.model_name if self.use_hf_model else "perplexity_burstiness",
                    "warnings": [] if self.use_hf_model else ["Dùng phương pháp thống kê làm phương án dự phòng."],
                },
                "detector": detector_type,
            }
        except Exception as exc:
            logger.error("Lỗi khi phân tích tài liệu AI detection: %s", exc, exc_info=True)
            raise

    async def analyze_large_document(self, text: str, batch_size: int = 16) -> Dict[str, Any]:
        """Backward-compatible alias for analyze_document."""
        del batch_size
        return await self.analyze_document(text)
