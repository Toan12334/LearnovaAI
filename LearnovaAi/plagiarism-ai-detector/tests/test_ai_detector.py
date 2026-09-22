"""
Unit tests for RobertaDetector in src/services/ai_detector.py
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
import torch

# Đảm bảo thư mục gốc plagiarism-ai-detector nằm trong sys.path khi chạy từ Visual Studio hoặc terminal
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.ai_detector import RobertaDetector


@pytest.fixture
def mock_transformers():
    """Mock AutoTokenizer và AutoModelForSequenceClassification để tránh tải model nặng khi test."""
    with patch("src.services.ai_detector.AutoTokenizer") as mock_tok_cls, \
         patch("src.services.ai_detector.AutoModelForSequenceClassification") as mock_model_cls:
        
        mock_tokenizer = MagicMock()
        mock_tok_cls.from_pretrained.return_value = mock_tokenizer

        mock_model = MagicMock()
        mock_model_cls.from_pretrained.return_value = mock_model
        # Cho phép chaining: mock_model.to().eval()
        mock_model.to.return_value = mock_model
        # Cấu hình id2label chuẩn của yaya36095/xlm-roberta-text-detector (Index 0 = HUMAN, Index 1 = AI)
        mock_model.config.id2label = {0: "HUMAN", 1: "AI"}

        yield {
            "mock_tokenizer_cls": mock_tok_cls,
            "mock_model_cls": mock_model_cls,
            "mock_tokenizer": mock_tokenizer,
            "mock_model": mock_model,
        }


def test_init_roberta_detector_default(mock_transformers):
    """Kiểm tra khởi tạo với model mặc định XLM-RoBERTa, cấu hình thiết bị và tự nhận diện nhãn index 1."""
    detector = RobertaDetector()

    assert detector.model_name == RobertaDetector.DEFAULT_MODEL_NAME
    # Mô hình XLM-RoBERTa có Index 1 = AI
    assert detector.ai_label_index == 1
    mock_transformers["mock_tokenizer_cls"].from_pretrained.assert_called_once_with(
        RobertaDetector.DEFAULT_MODEL_NAME
    )
    mock_transformers["mock_model_cls"].from_pretrained.assert_called_once_with(
        RobertaDetector.DEFAULT_MODEL_NAME
    )
    mock_transformers["mock_model"].to.assert_called_once()
    mock_transformers["mock_model"].eval.assert_called_once()


def test_init_roberta_detector_custom_model_and_device(mock_transformers):
    """Kiểm tra khởi tạo với tên model và thiết bị tùy biến."""
    custom_model = "custom-org/detector-roberta"
    detector = RobertaDetector(model_name=custom_model, device="cpu")

    assert detector.model_name == custom_model
    assert detector.device == torch.device("cpu")
    mock_transformers["mock_tokenizer_cls"].from_pretrained.assert_called_once_with(custom_model)
    mock_transformers["mock_model_cls"].from_pretrained.assert_called_once_with(custom_model)


def test_resolve_ai_label_index_variants(mock_transformers):
    """Kiểm thử các kịch bản ánh xạ id2label khác nhau từ các họ model khác nhau."""
    mock_model = mock_transformers["mock_model"]

    # Kịch bản 1: Index 0 = Human, Index 1 = AI
    mock_model.config.id2label = {0: "Human", 1: "AI"}
    detector_1 = RobertaDetector()
    assert detector_1.ai_label_index == 1

    # Kịch bản 2: Index 0 = machine-generated, Index 1 = human-written
    mock_model.config.id2label = {0: "machine-generated", 1: "human-written"}
    detector_2 = RobertaDetector()
    assert detector_2.ai_label_index == 0

    # Kịch bản 3: Index 0 = Real, Index 1 = Fake
    mock_model.config.id2label = {0: "real", 1: "fake"}
    detector_3 = RobertaDetector()
    assert detector_3.ai_label_index == 1

    # Kịch bản 4: Không có từ khóa AI nhưng có nhãn human ở index 0
    mock_model.config.id2label = {0: "Human written text", 1: "Other"}
    detector_4 = RobertaDetector()
    assert detector_4.ai_label_index == 1

    # Kịch bản 5: Không có id2label -> Fallback về 1
    mock_model.config.id2label = None
    detector_5 = RobertaDetector()
    assert detector_5.ai_label_index == 1


def test_predict_empty_and_whitespace(mock_transformers):
    """Kiểm tra văn bản rỗng hoặc toàn khoảng trắng trả về 0.0 ngay lập tức."""
    detector = RobertaDetector(device="cpu")

    assert detector.predict("") == 0.0
    assert detector.predict("   ") == 0.0
    assert detector.predict("\n\t  \r") == 0.0

    # Tokenizer và model không được gọi khi input rỗng
    mock_transformers["mock_tokenizer"].assert_not_called()
    mock_transformers["mock_model"].assert_not_called()


def test_predict_valid_text_with_dynamic_label(mock_transformers):
    """Kiểm tra luồng dự đoán hợp lệ, đúng tham số tokenizer, softmax tại self.ai_label_index và làm tròn 4 chữ số."""
    detector = RobertaDetector(device="cpu")
    # Với mô hình XLM-RoBERTa, nhãn AI nằm ở Index 1
    assert detector.ai_label_index == 1

    # Giả lập kết quả tokenizer
    mock_input_ids = torch.tensor([[101, 2054, 102]])
    mock_attention_mask = torch.tensor([[1, 1, 1]])
    mock_transformers["mock_tokenizer"].return_value = {
        "input_ids": mock_input_ids,
        "attention_mask": mock_attention_mask,
    }

    # Giả lập logits đầu ra từ model: ví dụ logits = [[-1.2, 2.5]]
    # Softmax tại index 1 (AI) sẽ chiếm ~0.9759
    mock_outputs = MagicMock()
    mock_outputs.logits = torch.tensor([[-1.2, 2.5]])
    mock_transformers["mock_model"].return_value = mock_outputs

    text_input = "This is an essay written by an advanced AI system."
    score = detector.predict(text_input)

    # 1. Xác thực tham số tokenize
    mock_transformers["mock_tokenizer"].assert_called_once_with(
        text_input,
        truncation=True,
        max_length=512,
        padding=True,
        return_tensors="pt",
    )

    # 2. Xác thực điểm số trả về là xác suất của index 1 (AI) làm tròn 4 chữ số
    expected_prob = round(float(torch.softmax(mock_outputs.logits, dim=-1)[0][1].item()), 4)
    assert score == expected_prob
    assert 0.0 <= score <= 1.0


def test_predict_async(mock_transformers):
    """Kiểm tra phương thức predict_async chạy qua thread pool và trả về kết quả chính xác."""
    import asyncio

    detector = RobertaDetector(device="cpu")
    assert detector.ai_label_index == 1

    # Logits: Index 0 (HUMAN) = 3.0 (cao), Index 1 (AI) = -2.0 (thấp)
    mock_outputs = MagicMock()
    mock_outputs.logits = torch.tensor([[3.0, -2.0]])
    mock_transformers["mock_model"].return_value = mock_outputs
    mock_transformers["mock_tokenizer"].return_value = {
        "input_ids": torch.tensor([[101, 102]]),
    }

    score = asyncio.run(detector.predict_async("This is purely written by a human student."))
    expected_prob = round(float(torch.softmax(mock_outputs.logits, dim=-1)[0][1].item()), 4)

    assert isinstance(score, float)
    assert score == expected_prob


def test_init_failure_raises_runtime_error():
    """Kiểm tra khi tải mô hình bị lỗi sẽ raise RuntimeError và ghi log."""
    with patch("src.services.ai_detector.AutoTokenizer.from_pretrained", side_effect=Exception("Network error")):
        with pytest.raises(RuntimeError) as exc_info:
            RobertaDetector()

        assert "Không thể khởi tạo RobertaDetector" in str(exc_info.value)


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main(["-v", __file__]))
