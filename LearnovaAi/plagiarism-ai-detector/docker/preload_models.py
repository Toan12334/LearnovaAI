"""
Script download và cache 2 model AI vào thư mục /app/model_cache khi build Docker image.
Chạy 1 lần duy nhất lúc docker build, không tải lại mỗi lần container khởi động.
"""

import os
import sys

# Đặt cache Hugging Face về thư mục cố định trong Docker image
cache_dir = "/app/model_cache"
os.environ["HF_HOME"] = cache_dir
os.environ["TRANSFORMERS_CACHE"] = cache_dir
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

print("=" * 70)
print("📦 BẮT ĐẦU DOWNLOAD VÀ CACHE CÁC MÔ HÌNH AI VÀO DOCKER IMAGE...")
print(f"   Cache Dir: {cache_dir}")
print("=" * 70)

# --- Model 1: BAAI/bge-m3 (Embedding cho Plagiarism Detection) ---
print("\n[1/2] Tải BAAI/bge-m3 (SentenceTransformer - Đa ngôn ngữ, 1024 chiều)...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("BAAI/bge-m3", cache_folder=cache_dir)
    # Test encode để chắc chắn model nạp được
    _ = model.encode(["test"], normalize_embeddings=True)
    print("   ✅ BAAI/bge-m3 đã tải và kiểm tra thành công!")
    del model
except Exception as e:
    print(f"   ❌ Lỗi khi tải BAAI/bge-m3: {e}")
    sys.exit(1)

# --- Model 2: yaya36095/xlm-roberta-text-detector (AI Content Detection) ---
print("\n[2/2] Tải yaya36095/xlm-roberta-text-detector (XLM-RoBERTa - Phát hiện văn bản AI)...")
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    AutoTokenizer.from_pretrained("yaya36095/xlm-roberta-text-detector", cache_dir=cache_dir)
    AutoModelForSequenceClassification.from_pretrained(
        "yaya36095/xlm-roberta-text-detector", cache_dir=cache_dir
    )
    print("   ✅ XLM-RoBERTa AI Detector đã tải thành công!")
except Exception as e:
    print(f"   ❌ Lỗi khi tải XLM-RoBERTa: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("🎉 TẤT CẢ MÔ HÌNH ĐÃ ĐƯỢC CACHE VÀO IMAGE THÀNH CÔNG!")
print("=" * 70)
