import pytest
from datetime import datetime
from src.services.timestamp.date_extractor import DateExtractor


def test_extract_meta_published_time():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="article:published_time" content="2024-03-15T08:30:00Z" />
    </head>
    <body>
        <h1>Bài viết tin tức</h1>
    </body>
    </html>
    """
    date = DateExtractor.extract_from_html(sample_html)
    assert date is not None
    assert date.year == 2024
    assert date.month == 3
    assert date.day == 15


def test_extract_json_ld_date():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": "Tiêu đề bài viết",
            "datePublished": "2023-11-20T14:00:00+07:00"
        }
        </script>
    </head>
    <body>
        <p>Nội dung</p>
    </body>
    </html>
    """
    date = DateExtractor.extract_from_html(sample_html)
    assert date is not None
    assert date.year == 2023
    assert date.month == 11
    assert date.day == 20
