"""Unit tests for the asynchronous Internet plagiarism pipeline and its 5 core modules."""

import asyncio
from pathlib import Path
import sys
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.plagiarism.chunker import (
    InternetPlagiarismChunker,
    extract_searchable_chunks,
)
from src.services.plagiarism.internet_pipeline import InternetPlagiarismService
from src.services.plagiarism.query_builder import DualQueryBuilder
from src.services.plagiarism.semantic_matcher import SemanticMatcher
from src.services.plagiarism.qdrant_cache import InternetQdrantCache
from src.services.plagiarism.web_scraper import AsyncWebScraper
from src.api.v1.endpoints import plagiarism as plagiarism_endpoint
from src.models.request import InternetPlagiarismRequest


def test_chunker_filters_noise_and_selects_information_rich_chunks():
    """References, TOC, and short sentences must not become search queries."""
    text = " ".join([
        "Mục lục chương một chương hai chương ba chương bốn chương năm chương sáu chương bảy.",
        "Nghiên cứu khí hậu Việt Nam năm 2024 phân tích dữ liệu nhiệt độ, lượng mưa và phát thải carbon tại đô thị lớn.",
        "Các nhà khoa học sử dụng mô hình thống kê phức tạp để dự báo rủi ro ngập lụt và biến động nguồn nước khu vực.",
        "Kết quả cho thấy chỉ số phát thải công nghiệp tăng mười hai phần trăm trong giai đoạn quan sát kéo dài nhiều năm.",
        "Tài liệu tham khảo các công trình trước đây được liệt kê riêng ở phần cuối báo cáo học thuật này.",
    ])
    chunks = extract_searchable_chunks(text)
    assert chunks
    assert all("Mục lục" not in chunk["text"] and "Tài liệu tham khảo" not in chunk["text"] for chunk in chunks)
    assert all(chunk["complexity"] > 0 for chunk in chunks)
    assert all(chunk["word_count"] >= 15 for chunk in chunks)


def test_query_builder_generates_exact_and_entity_queries():
    """A rich Vietnamese chunk yields a quoted phrase (6-8 words) and an AND entity query."""
    qb = DualQueryBuilder()
    chunk = {"text": "Biến đổi khí hậu tại Việt Nam làm gia tăng rác thải nhựa đô thị trong năm 2024 và ảnh hưởng cộng đồng."}
    queries = qb.build_queries(chunk)
    assert len(queries) >= 1
    # Query 1: Quoted phrase
    assert queries[0].startswith('"') and queries[0].endswith('"')
    # Query 2: Entity query with AND
    if len(queries) > 1:
        assert " AND " in queries[1]

    # Verify entity extraction
    entities = qb.extract_entities_and_nouns(chunk["text"])
    assert len(entities) >= 2


def test_semantic_matcher_cosine_and_threshold_classification():
    """Cosine similarity classification: >=0.90 -> EXACT, 0.78-0.90 -> PARAPHRASED, <0.78 -> ignored."""
    matcher = SemanticMatcher()
    assert matcher.cosine([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert matcher.cosine([0.0, 0.0], [1.0, 0.0]) == 0.0

    # Test find_matches with mock vectors
    chunks = [{"chunk_id": 0, "text": "Đoạn văn gốc của người dùng"}]
    pages = {"https://example.com/source": "Đoạn văn tương đồng trên trang web được bóc tách từ internet."}

    # High similarity -> EXACT
    async def mock_exact_encode(texts):
        return [[1.0, 0.0] for _ in texts]

    matcher.encode = mock_exact_encode
    matches_exact = asyncio.run(matcher.find_matches(chunks, pages, exact_threshold=0.90, paraphrase_threshold=0.78))
    assert len(matches_exact) == 1
    assert matches_exact[0]["type"] == "EXACT"
    assert matches_exact[0]["similarity_score"] >= 0.90

    # Medium similarity -> PARAPHRASED
    async def mock_paraphrase_encode(texts):
        # Cosine of [1, 0] and [0.85, 0.52678] is 0.85
        return [[1.0, 0.0] if "người dùng" in t else [0.85, 0.52678] for t in texts]

    matcher.encode = mock_paraphrase_encode
    matches_para = asyncio.run(matcher.find_matches(chunks, pages, exact_threshold=0.90, paraphrase_threshold=0.78))
    assert len(matches_para) == 1
    assert matches_para[0]["type"] == "PARAPHRASED"
    assert 0.78 <= matches_para[0]["similarity_score"] < 0.90

    # Low similarity -> Ignored
    async def mock_low_encode(texts):
        # Orthogonal vectors -> cosine = 0.0
        return [[1.0, 0.0] if "người dùng" in t else [0.0, 1.0] for t in texts]

    matcher.encode = mock_low_encode
    matches_low = asyncio.run(matcher.find_matches(chunks, pages, exact_threshold=0.90, paraphrase_threshold=0.78))
    assert len(matches_low) == 0


def test_qdrant_cache_point_id_deterministic():
    """Qdrant cache generates valid deterministic UUID format."""
    id1 = InternetQdrantCache._point_id("https://example.com", "Sample text")
    id2 = InternetQdrantCache._point_id("https://example.com", "Sample text")
    assert id1 == id2
    assert len(id1) == 36
    assert id1.count("-") == 4


def test_web_scraper_ram_cache():
    """Scraper utilizes in-memory RAM cache on repeat URLs."""
    scraper = AsyncWebScraper()
    scraper._content_cache["https://cached.com/article"] = "Cached article body"
    result = asyncio.run(scraper.scrape_web_content(["https://cached.com/article"]))
    assert result == {"https://cached.com/article": "Cached article body"}


class FakeChunker:
    def extract_searchable_chunks(self, text):
        return [{"chunk_id": 0, "text": "User paragraph", "sentences": ["User paragraph"]}]


class FakeQueryBuilder:
    def build_queries(self, chunk):
        return ['"User paragraph"', '"entity one" AND "entity two" AND "entity three"']


class FakeScraper:
    async def fetch_candidate_urls(self, queries):
        assert len(queries) == 2
        return ["https://example.com/article"]

    async def scrape_web_content(self, urls):
        return {urls[0]: "Scraped sentence with enough words to become a semantic matching candidate from the web."}


class FakeMatcher:
    async def encode(self, texts):
        return [[1.0, 0.0] for _ in texts]

    async def find_matches(self, chunks, pages, exact_threshold, paraphrase_threshold):
        return [{
            "chunk_id": 0,
            "user_text": chunks[0]["text"],
            "matched_text": "Source text",
            "similarity_score": 0.84,
            "type": "PARAPHRASED",
            "source_url": "https://example.com/article",
        }]

    def split_sentences(self, text):
        return [text]


class FakeCache:
    async def search(self, vector):
        return []

    async def store(self, pages, matcher):
        return None


def test_pipeline_reports_paraphrased_percentage_with_fakes():
    """The report separates exact and paraphrased chunk rates."""
    service = InternetPlagiarismService(FakeChunker(), FakeQueryBuilder(), FakeScraper(), FakeMatcher(), FakeCache())
    result = asyncio.run(service.check("A valid document body that is long enough for the API request model."))
    assert result["total_chunks_analyzed"] == 1
    assert result["plagiarism_percentage"] == 100.0
    assert result["exact_match_percentage"] == 0.0
    assert result["paraphrased_percentage"] == 100.0
    assert len(result["matches"]) == 1
    assert result["matches"][0]["type"] == "PARAPHRASED"


def test_check_internet_endpoint_returns_documented_shape(monkeypatch):
    """The dedicated endpoint must expose the Internet report matching the required JSON output schema."""
    class FakeInternetService:
        async def check(self, text):
            return {
                "total_chunks_analyzed": 45,
                "plagiarism_percentage": 18.5,
                "exact_match_percentage": 12.0,
                "paraphrased_percentage": 6.5,
                "matches": [
                    {
                        "user_text": "Thiên nhiên luôn mang đến cho con người những điều tuyệt vời và bình yên.",
                        "matched_text": "Môi trường tự nhiên cung cấp cho con người vô số lợi ích kỳ diệu và sự thư thái.",
                        "similarity_score": 0.84,
                        "type": "PARAPHRASED",
                        "source_url": "https://example.com/bai-viet-moi-truong",
                    }
                ],
            }

    monkeypatch.setattr(plagiarism_endpoint, "internet_plagiarism_service", FakeInternetService())
    response = asyncio.run(plagiarism_endpoint.check_internet_plagiarism(
        InternetPlagiarismRequest(text="Đây là một nội dung kiểm thử đủ dài để thỏa mãn điều kiện kiểm tra Internet của API mới."),
    ))
    assert response.total_chunks_analyzed == 45
    assert response.plagiarism_percentage == 18.5
    assert response.exact_match_percentage == 12.0
    assert response.paraphrased_percentage == 6.5
    assert len(response.matches) == 1
    assert response.matches[0].similarity_score == 0.84
    assert response.matches[0].type == "PARAPHRASED"
    assert response.matches[0].source_url == "https://example.com/bai-viet-moi-truong"
