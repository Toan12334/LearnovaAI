from fastapi import APIRouter
from src.api.v1.endpoints import plagiarism, timestamp, ai_detection

api_router = APIRouter()

api_router.include_router(plagiarism.router, prefix="/plagiarism", tags=["Plagiarism [GD1]"])
api_router.include_router(timestamp.router, prefix="/timestamp", tags=["Timestamp [GD1]"])
api_router.include_router(ai_detection.router, prefix="/ai-detection", tags=["AI Detection [GD2]"])
