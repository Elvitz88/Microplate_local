import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import capture
from app.api.routes import health
from app.api.routes import stream
from app.api.routes import websocket
from app.core.auth import verify_token
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.core.websocket_manager import WebSocketManager
from app.services.camera_service import CameraService
from app.services.status_service import StatusService

configure_logging()
logger = logging.getLogger("vision-capture-service")

camera_service: CameraService = None
status_service: StatusService = None
websocket_manager: WebSocketManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global camera_service, status_service, websocket_manager

    logger.info("Starting Vision Capture Service...")

    try:
        camera_service = CameraService()
        status_service = StatusService()
        websocket_manager = WebSocketManager()

        await camera_service.initialize()

        asyncio.create_task(status_service.start_monitoring())

        logger.info("Vision Capture Service started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start Vision Capture Service", extra={"error": str(e)})
        raise
    finally:
        logger.info("Shutting down Vision Capture Service...")
        if camera_service:
            await camera_service.cleanup()
        if websocket_manager:
            await websocket_manager.cleanup()


app = FastAPI(
    title="Vision Capture Service",
    description="Camera capture service for HAllytics microplate analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
# Get allowed origins from environment or use defaults
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:6410,http://localhost:3000,http://localhost").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Specific origins (required when credentials=True)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(capture.router, prefix="/api/v1/capture", tags=["capture"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["stream"])


@app.get("/")
async def root():
    return {
        "message": "Vision Capture Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/v1/capture/health",
            "capture": "/api/v1/capture/image",
            "status": "/api/v1/capture/status",
            "websocket": "/ws/capture",
            "mjpeg": "/api/v1/stream/mjpeg"
        }
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Global exception", extra={"error": str(exc)})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred"
            }
        }
    )


def get_camera_service() -> CameraService:
    if camera_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera service not initialized"
        )
    return camera_service


def get_status_service() -> StatusService:
    if status_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Status service not initialized"
        )
    return status_service


def get_websocket_manager() -> WebSocketManager:
    if websocket_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebSocket manager not initialized"
        )
    return websocket_manager


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )
