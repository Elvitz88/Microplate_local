import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.auth import verify_token, auth_service
from app.services.camera_service import CameraService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_camera_service() -> CameraService:
    from main import camera_service
    if camera_service is None:
        raise HTTPException(status_code=503, detail="Camera service not available")
    return camera_service


@router.get("/mjpeg")
async def mjpeg_stream(
    camera_service: CameraService = Depends(get_camera_service),
    token_data: Optional[Dict[str, Any]] = None,
    w: Optional[int] = Query(None, description="resize width"),
    h: Optional[int] = Query(None, description="resize height"),
    q: Optional[int] = Query(None, ge=1, le=100, description="jpeg quality"),
    fps: Optional[int] = Query(None, ge=1, le=120, description="max frames per second"),
    token: Optional[str] = Query(None, description="JWT token for auth (alternative to Authorization header)")
):
    try:
        if token_data is None and token:
            auth_service.verify_token(token)

        if not camera_service.is_initialized or camera_service.camera is None:
            ok = await camera_service.initialize()
            if not ok:
                raise HTTPException(status_code=503, detail="Camera not initialized")

        def frame_generator():
            boundary = b"--frame"
            for frame_bytes in camera_service.mjpeg_frame_iterator(quality=q, width=w, height=h, max_fps=fps):
                yield (
                    boundary + b"\r\n"
                    + b"Content-Type: image/jpeg\r\n"
                    + b"Content-Length: " + str(len(frame_bytes)).encode() + b"\r\n\r\n"
                    + frame_bytes + b"\r\n"
                )

        return StreamingResponse(
            frame_generator(),
            media_type='multipart/x-mixed-replace; boundary=frame'
        )
    except Exception as e:
        logger.error(f"MJPEG stream error: {e}")
        raise HTTPException(status_code=500, detail="Failed to start stream")


@router.post("/stop")
async def stop_stream(
    camera_service: CameraService = Depends(get_camera_service),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    camera_service.stop_streaming()
    return {"success": True}


