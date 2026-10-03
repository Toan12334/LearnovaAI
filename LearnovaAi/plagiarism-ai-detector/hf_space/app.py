"""
Hugging Face Spaces entry point - Pure FastAPI (no Gradio).
Runs FastAPI directly on port 7860.

IMPORTANT: Monkey-patch websockets.asyncio BEFORE any other imports.
ZeroGPU forces gradio-client==1.3.0 which pins websockets<12,
but supabase's realtime-py tries to import websockets.asyncio (needs >=13).
Since we don't use realtime WebSocket features, a stub is sufficient.
"""

import sys
import types

# ── Monkey-patch websockets.asyncio if missing (websockets < 13 installed) ──
try:
    import websockets.asyncio  # noqa
except (ImportError, ModuleNotFoundError):
    import websockets  # noqa
    _asyncio_mod = types.ModuleType("websockets.asyncio")
    _client_mod = types.ModuleType("websockets.asyncio.client")

    class _ClientConnection:
        """Stub: we don't use realtime WebSocket features."""
        pass

    _client_mod.ClientConnection = _ClientConnection
    _asyncio_mod.client = _client_mod
    websockets.asyncio = _asyncio_mod
    sys.modules["websockets.asyncio"] = _asyncio_mod
    sys.modules["websockets.asyncio.client"] = _client_mod

# ── ZeroGPU Startup Hook ───────────────────────────────────────────────────
try:
    import spaces

    @spaces.GPU
    def _zero_gpu_registered_fn():
        """Top-level GPU decorated function required by HF ZeroGPU engine."""
        pass
except Exception:
    pass

# ── Normal imports after patch ───────────────────────────────────────────────
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from src.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=7860,
        workers=1,
        log_level="info",
    )
