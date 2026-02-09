import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends

from app.services.status_service import StatusService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_status_service() -> StatusService:
    from main import status_service
    if status_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Status service not available"
        )
    return status_service


@router.get("/health")
async def health_check(
    status_service: StatusService = Depends(get_status_service)
):
    try:
        return {
            "status": "healthy",
            "service": "Vision Capture Service",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "unhealthy", "error": str(e)}
        )


@router.get("/health/detailed")
async def detailed_health_check(
    status_service: StatusService = Depends(get_status_service)
):
    try:
        health_status = await status_service.get_health_status()
        return health_status
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "status": "unhealthy",
                "error": str(e)
            }
        )


@router.get("/health/system")
async def system_health_check(
    status_service: StatusService = Depends(get_status_service)
):
    try:
        system_info = await status_service.get_system_info()
        return {
            "success": True,
            "status": "healthy",
            "system_info": system_info
        }
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "status": "unhealthy",
                "error": str(e)
            }
        )
