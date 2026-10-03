"""
Hugging Face Spaces entry point - FastAPI on ZeroGPU.

Import order is critical:
1. websockets.asyncio stub (for supabase realtime)
2. HfFolder stub into huggingface_hub (ZeroGPU base installs hf_hub>=0.30
   which removed HfFolder, but gradio==4.44.0 / spaces still imports it)
3. import spaces  (top-level, required for ZeroGPU static scan)
4. FastAPI app
"""

import os
import sys
import types

# ── 1. Monkey-patch websockets.asyncio FIRST ──────────────────────────────────
try:
    import websockets.asyncio  # noqa: F401
except (ImportError, ModuleNotFoundError):
    import websockets as _ws  # noqa: F401
    _asyncio_mod = types.ModuleType("websockets.asyncio")
    _client_mod = types.ModuleType("websockets.asyncio.client")

    class _ClientConnection:  # noqa: D101
        pass

    _client_mod.ClientConnection = _ClientConnection
    _asyncio_mod.client = _client_mod
    _ws.asyncio = _asyncio_mod  # type: ignore[attr-defined]
    sys.modules["websockets.asyncio"] = _asyncio_mod
    sys.modules["websockets.asyncio.client"] = _client_mod

# ── 2. Restore HfFolder stub into huggingface_hub before spaces/gradio ────────
#    ZeroGPU forces:  huggingface_hub >= 0.30 (removed HfFolder)
#                   + gradio == 4.44.0        (still imports HfFolder)
#    We inject a minimal stub so the import chain doesn't break.
import huggingface_hub as _hf_hub  # noqa: E402
if not hasattr(_hf_hub, "HfFolder"):
    class _HfFolder:
        """Minimal stub replacing the removed huggingface_hub.HfFolder."""

        @staticmethod
        def get_token() -> str | None:
            return os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")

        @staticmethod
        def save_token(token: str) -> None:  # noqa: ARG004
            pass

        @staticmethod
        def delete_token() -> None:
            pass

        @classmethod
        def path_token(cls) -> str:
            return os.path.expanduser("~/.cache/huggingface/token")

    _hf_hub.HfFolder = _HfFolder  # type: ignore[attr-defined]
    sys.modules["huggingface_hub"].HfFolder = _HfFolder  # type: ignore[attr-defined]

# ── 3. Now import spaces (top-level — required for ZeroGPU static scan) ───────
import spaces  # noqa: E402


@spaces.GPU(duration=60)
def run_gpu_inference(texts: list, model, tokenizer, device) -> list:
    """
    GPU-accelerated inference wrapper required by HF ZeroGPU.
    Called by AIDetectorService for PhoBERT predictions.
    ZeroGPU grants GPU access only during @spaces.GPU function execution.
    """
    import torch
    import torch.nn.functional as F

    encoded = tokenizer(
        texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=256,
    )
    input_ids = encoded["input_ids"].to(device)
    attention_mask = encoded["attention_mask"].to(device)
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        probs = F.softmax(outputs.logits, dim=-1)
    return [
        {
            "ai_score": round(float(probs[i, 1].item()), 4),
            "human_score": round(float(probs[i, 0].item()), 4),
        }
        for i in range(len(texts))
    ]


# Expose so ai_detector.py can import without circular dependency
sys.modules["__hf_gpu_inference__"] = types.SimpleNamespace(  # type: ignore[attr-defined]
    run_gpu_inference=run_gpu_inference
)

# ── 4. FastAPI application ────────────────────────────────────────────────────
from pathlib import Path  # noqa: E402

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from src.main import app  # noqa: E402  # FastAPI ASGI app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=7860,
        workers=1,
        log_level="info",
    )
