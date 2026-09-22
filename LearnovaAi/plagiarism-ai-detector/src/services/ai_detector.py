"""
AI Detector Service Module.

Triển khai RobertaDetector để phát hiện văn bản do AI (ChatGPT/LLM) tạo ra
sử dụng mô hình Transformer phân lớp chuỗi (Sequence Classification).
"""

import asyncio
from typing import Optional
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from src.core.logging import logger


class RobertaDetector:
    """
    Bộ phát hiện văn bản do AI sinh ra sử dụng kiến trúc RoBERTa.

    Mô hình nạp Tokenizer và Weights một lần duy nhất khi khởi tạo,
    chuyển sang chế độ eval() và thực hiện dự đoán với torch.no_grad()
    nhằm tối ưu hóa bộ nhớ RAM/VRAM và tốc độ suy luận (inference).

    Attributes:
        model_name (str): Tên hoặc đường dẫn của pre-trained model trên HuggingFace.
        device (torch.device): Thiết bị phần cứng tính toán (CPU hoặc CUDA GPU).
        tokenizer (AutoTokenizer): Tokenizer xử lý chuỗi văn bản đầu vào.
        model (AutoModelForSequenceClassification): Mô hình RoBERTa phân lớp nhãn AI.
    """

    DEFAULT_MODEL_NAME = "yaya36095/xlm-roberta-text-detector"

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
    ) -> None:
        """
        Khởi tạo RobertaDetector, nạp Tokenizer và Model vào bộ nhớ.

        Args:
            model_name: Tên mô hình HuggingFace. Mặc định là "yaya36095/xlm-roberta-text-detector" (hỗ trợ Tiếng Việt & Đa ngôn ngữ).
            device: Thiết bị chạy mô hình ("cpu", "cuda", hoặc None để tự động nhận diện).

        Raises:
            RuntimeError: Nếu xảy ra lỗi trong quá trình tải Tokenizer hoặc Model weights.
        """
        self.model_name: str = model_name or self.DEFAULT_MODEL_NAME

        # Tự động phát hiện thiết bị tính toán nếu không được chỉ định
        if device is not None:
            self.device: torch.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        logger.info(
            "Đang khởi tạo RobertaDetector với model '%s' trên thiết bị '%s'...",
            self.model_name,
            self.device,
        )

        try:
            # Nạp Tokenizer và Model một lần duy nhất
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)

            # Đưa mô hình lên thiết bị tương ứng và chuyển sang chế độ đánh giá (evaluation)
            self.model.to(self.device)
            self.model.eval()

            # Tự động phân giải chỉ số nhãn đại diện cho AI từ config.id2label
            self.ai_label_index: int = self._resolve_ai_label_index()

            logger.info(
                "Khởi tạo và tải trọng số RobertaDetector thành công (AI label index = %d).",
                self.ai_label_index,
            )
        except Exception as exc:
            logger.error(
                "Lỗi nghiêm trọng khi nạp mô hình RoBERTa '%s': %s",
                self.model_name,
                exc,
                exc_info=True,
            )
            raise RuntimeError(
                f"Không thể khởi tạo RobertaDetector với model '{self.model_name}': {exc}"
            ) from exc

    def _resolve_ai_label_index(self) -> int:
        """
        Tự động phân tích config.id2label của mô hình để xác định Index tương ứng với nhãn AI/ChatGPT.

        Quy tắc phân tích:
        1. Tìm kiếm các từ khóa chỉ AI: ["chatgpt", "ai", "fake", "generated", "machine"].
        2. Nếu không có từ khóa AI trực tiếp, tìm nhãn 'human'/'real' và chọn nhãn đối nghịch.
        3. Fallback về Index 1 (có cảnh báo warning) nếu không phân tích được.

        Returns:
            int: Vị trí Index đại diện cho nhãn văn bản do AI sinh ra.
        """
        id2label = getattr(getattr(self.model, "config", None), "id2label", None)
        ai_keywords = ["chatgpt", "ai", "fake", "generated", "machine"]

        if isinstance(id2label, dict) and id2label:
            # 1. Tìm nhãn chứa từ khóa AI trực tiếp
            for idx, label in id2label.items():
                label_lower = str(label).strip().lower()
                if any(kw in label_lower for kw in ai_keywords):
                    logger.info(
                        "Đã ánh xạ nhãn AI từ config.id2label: Index %s -> '%s'",
                        idx,
                        label,
                    )
                    return int(idx)

            # 2. Nếu id2label có 2 nhãn và có nhãn human/real, lấy nhãn còn lại
            for idx, label in id2label.items():
                label_lower = str(label).strip().lower()
                if "human" in label_lower or "real" in label_lower:
                    other_indices = [int(i) for i in id2label.keys() if int(i) != int(idx)]
                    if other_indices:
                        ai_idx = other_indices[0]
                        logger.info(
                            "Suy luận nhãn AI tại Index %d (đối nghịch với nhãn '%s' tại Index %s)",
                            ai_idx,
                            label,
                            idx,
                        )
                        return ai_idx

        # 3. Cảnh báo và fallback về mặc định
        logger.warning(
            "Không thể nhận diện nhãn AI từ config.id2label (%s). Mặc định sử dụng index 1.",
            id2label,
        )
        return 1

    def predict(self, text: str) -> float:
        """
        Dự đoán xác suất văn bản được tạo ra bởi AI (đồng bộ).

        Quy trình xử lý:
        1. Kiểm tra văn bản rỗng hoặc chỉ chứa khoảng trắng -> trả về 0.0.
        2. Tokenize chuỗi văn bản với truncation=True, max_length=512, padding=True.
        3. Tắt Gradient tính toán với `torch.no_grad()`.
        4. Áp dụng hàm softmax trên logits và lấy xác suất tại self.ai_label_index.
        5. Làm tròn kết quả 4 chữ số thập phân.

        Args:
            text: Chuỗi văn bản cần kiểm tra.

        Returns:
            float: Điểm xác suất văn bản do AI tạo ra trong khoảng [0.0, 1.0].
        """
        # Kiểm tra văn bản rỗng hoặc chỉ chứa khoảng trắng
        if not text or not text.strip():
            logger.debug("Văn bản đầu vào rỗng, trả về xác suất AI mặc định: 0.0")
            return 0.0

        try:
            # Tokenize văn bản với giới hạn ngữ cảnh tối đa 512 tokens
            inputs = self.tokenizer(
                text,
                truncation=True,
                max_length=512,
                padding=True,
                return_tensors="pt",
            )

            # Chuyển tensor đầu vào sang cùng thiết bị với model
            inputs = {key: tensor.to(self.device) for key, tensor in inputs.items()}

            # Thực hiện suy luận không tính Gradient (tiết kiệm tối đa RAM và CPU)
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)

                # Sử dụng chỉ số nhãn AI đã được phân giải động từ config
                ai_probability = probabilities[0][self.ai_label_index].item()

                result = round(float(ai_probability), 4)
                logger.debug(
                    "Dự đoán AI hoàn tất: score=%.4f (label_index=%d)",
                    result,
                    self.ai_label_index,
                )
                return result

        except Exception as exc:
            logger.error("Lỗi trong quá trình suy luận văn bản: %s", exc, exc_info=True)
            raise

    async def predict_async(self, text: str) -> float:
        """
        Dự đoán xác suất văn bản do AI tạo ra (bất đồng bộ).

        Đẩy tác vụ tính toán CPU-bound sang thread pool riêng biệt thông qua
        `asyncio.to_thread` nhằm tránh làm tắc nghẽn (block) Event Loop của FastAPI.

        Args:
            text: Chuỗi văn bản cần phân tích.

        Returns:
            float: Điểm xác suất AI trong đoạn [0.0, 1.0].
        """
        return await asyncio.to_thread(self.predict, text)
