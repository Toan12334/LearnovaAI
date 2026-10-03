"""
Hugging Face Spaces entry point - FastAPI on ZeroGPU.
spaces must be imported at top level (not inside try/except) so ZeroGPU
static analysis can detect @spaces.GPU decorated functions.
"""

import sys
import types

# ── Monkey-patch websockets.asyncio FIRST (before any supabase imports) ──────
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

# ── ZeroGPU: import spaces at module top-level (required for static scan) ────
import spaces  # noqa: E402


@spaces.GPU(duration=60)
def run_gpu_inference(texts: list, model, tokenizer, device) -> list:
    """
    GPU-accelerated inference wrapper required by HF ZeroGPU.
    Called by AIDetectorService when running PhoBERT predictions.
    ZeroGPU grants GPU access only during execution of @spaces.GPU functions.
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
    results = []
    for i in range(len(texts)):
        results.append({
            "ai_score": round(float(probs[i, 1].item()), 4),
            "human_score": round(float(probs[i, 0].item()), 4),
        })
    return results


# ── Expose run_gpu_inference so ai_detector.py can import it ─────────────────
sys.modules["__hf_gpu_inference__"] = types.SimpleNamespace(  # type: ignore[attr-defined]
    run_gpu_inference=run_gpu_inference
)

# ── Normal FastAPI application ────────────────────────────────────────────────
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
