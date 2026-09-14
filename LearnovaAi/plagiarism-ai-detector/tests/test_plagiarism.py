import pytest
from src.services.plagiarism.winnowing import WinnowingDetector
from src.utils.text_cleaner import TextCleaner


def test_vietnamese_text_normalization():
    raw = "Đây   là    văn bản   tiếng   Việt cần   chuẩn hóa.\n\n"
    normalized = TextCleaner.normalize_vietnamese(raw)
    assert normalized == "Đây là văn bản tiếng Việt cần chuẩn hóa."


def test_winnowing_exact_match():
    detector = WinnowingDetector(k_gram_size=10, window_size=4)
    text1 = "Hệ thống phát hiện đạo văn ứng dụng trí tuệ nhân tạo hiện đại."
    text2 = "Hệ thống phát hiện đạo văn ứng dụng trí tuệ nhân tạo hiện đại."

    score = detector.calculate_similarity(text1, text2)
    assert score == 1.0


def test_winnowing_different_text():
    detector = WinnowingDetector(k_gram_size=10, window_size=4)
    text1 = "Học máy và trí tuệ nhân tạo đang thay đổi thế giới công nghệ."
    text2 = "Thời tiết hôm nay tại Hà Nội rất đẹp và nắng nhẹ."

    score = detector.calculate_similarity(text1, text2)
    assert score < 0.1
