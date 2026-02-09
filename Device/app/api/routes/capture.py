import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse, Response

from app.core.auth import verify_token
from app.models.schemas import (
    CaptureRequest,
    CaptureResponse,
    CameraStatus,
    ErrorResponse,
    ServiceStatus,
)
from app.services.camera_service import CameraService
from app.services.status_service import StatusService
from app.core.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()


def get_camera_service() -> CameraService:
    from main import camera_service
    if camera_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera service not available"
        )
    return camera_service


def get_status_service() -> StatusService:
    from main import status_service
    if status_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Status service not available"
        )
    return status_service


def get_websocket_manager() -> WebSocketManager:
    from main import websocket_manager
    if websocket_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebSocket manager not available"
        )
    return websocket_manager




@router.get("/health", response_model=Dict[str, Any])
async def health_check(
    status_service: StatusService = Depends(get_status_service)
):
    try:
        health_status = await status_service.get_health_status()
        return health_status
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "HEALTH_CHECK_FAILED",
                    "message": "Health check failed"
                }
            }
        )




@router.get("/image/{filename}")
async def get_captured_image(
    filename: str,
    camera_service: CameraService = Depends(get_camera_service)
):
    try:
        resource = camera_service.get_image_resource(filename)
        if resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

        headers = {
            "Content-Disposition": f"inline; filename=\"{filename}\"",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }

        if resource.get("type") == "file":
            return FileResponse(
                path=str(resource["path"]),
                media_type="image/jpeg",
                filename=filename,
                headers=headers,
            )

        return Response(content=resource.get("bytes"), media_type="image/jpeg", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve image {filename}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to serve image")

@router.get("/status", response_model=CameraStatus)
async def get_camera_status(
    camera_service: CameraService = Depends(get_camera_service),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    try:
        status = await camera_service.get_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get camera status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "STATUS_CHECK_FAILED",
                    "message": "Failed to get camera status"
                }
            }
        )


@router.post("/image", response_model=CaptureResponse)
async def capture_image(
    request: CaptureRequest,
    background_tasks: BackgroundTasks,
    camera_service: CameraService = Depends(get_camera_service),
    websocket_manager: WebSocketManager = Depends(get_websocket_manager),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    try:
        logger.info(f"Capture request received: {request.sample_no}")

        await websocket_manager.broadcast_capture_progress({
            "stage": "starting",
            "progress": 0,
            "message": "Starting image capture...",
            "sample_no": request.sample_no
        })

        success, image_data, error_message = await camera_service.capture_image(
            sample_no=request.sample_no,
            submission_no=request.submission_no,
            description=request.description,
            quality=request.quality
        )

        if success and image_data:
            await websocket_manager.broadcast_capture_result({
                "success": True,
                "message": "Image captured successfully",
                "image_data": image_data.dict(),
                "sample_no": request.sample_no
            })

            from app.core.config import settings
            background_tasks.add_task(
                camera_service.cleanup_captures,
                settings.MAX_CAPTURE_AGE_HOURS
            )

            return CaptureResponse(
                success=True,
                message="Image captured successfully",
                data={
                    "image_data": image_data.dict(),
                    "sample_no": request.sample_no,
                    "submission_no": request.submission_no
                }
            )
        else:
            await websocket_manager.broadcast_capture_result({
                "success": False,
                "message": error_message or "Image capture failed",
                "sample_no": request.sample_no
            })

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "success": False,
                    "error": {
                        "code": "CAPTURE_FAILED",
                        "message": error_message or "Image capture failed"
                    }
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image capture error: {e}")

        try:
            await websocket_manager.broadcast_capture_result({
                "success": False,
                "message": f"Capture error: {str(e)}",
                "sample_no": request.sample_no
            })
        except:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "CAPTURE_ERROR",
                    "message": "Internal server error during capture"
                }
            }
        )


@router.post("/test", response_model=Dict[str, Any])
async def test_camera(
    camera_service: CameraService = Depends(get_camera_service),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    try:
        success, error_message = await camera_service.test_camera()
        
        if success:
            return {
                "success": True,
                "message": "Camera test successful",
                "data": {
                    "camera_status": "working",
                    "device_info": camera_service.get_device_info()
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": {
                        "code": "CAMERA_TEST_FAILED",
                        "message": error_message or "Camera test failed"
                    }
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Camera test error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "TEST_ERROR",
                    "message": "Internal server error during camera test"
                }
            }
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_capture_stats(
    camera_service: CameraService = Depends(get_camera_service),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    try:
        stats = await camera_service.get_capture_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"Failed to get capture stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "STATS_ERROR",
                    "message": "Failed to get capture statistics"
                }
            }
        )


@router.get("/service-status", response_model=ServiceStatus)
async def get_service_status(
    status_service: StatusService = Depends(get_status_service),
    token_data: Dict[str, Any] = Depends(verify_token)
):
    try:
        service_status = await status_service.get_service_status()
        return service_status
    except Exception as e:
        logger.error(f"Failed to get service status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "SERVICE_STATUS_ERROR",
                    "message": "Failed to get service status"
                }
            }
        )
