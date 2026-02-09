import os
import uuid
import shutil
import cv2
import logging
import time
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator

from app.services.grid_builder_service import GridBuilder
from app.services.predictor_service import Predictor
from app.services.result_processor_service import ResultProcessor
from app.services.db_service import db_service
from app.services.image_uploader_service import image_uploader
from app.services.calibration_service import CalibrationService
from app.config import Config

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
                                            
    try:
        token = credentials.credentials
        secret = os.getenv('JWT_ACCESS_SECRET', 'your-secret-key')
        issuer = os.getenv('JWT_ISSUER')
        audience = os.getenv('JWT_AUDIENCE')
        
                      
        payload = jwt.decode(
            token, 
            secret, 
            algorithms=['HS256'],
            issuer=issuer,
            audience=audience
        )
        
                          
        return {
            'id': payload.get('sub') or payload.get('id'),
            'email': payload.get('email'),
            'role': payload.get('role', 'user')
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

router = APIRouter()

model_path = getattr(Config, 'MODEL_PATH', None)
if not model_path:
    logger.error("MODEL_PATH not configured in Config")
    raise RuntimeError("MODEL_PATH not configured in Config")

def get_calibration_service():
    return CalibrationService()

def get_grid_builder():
    return GridBuilder(calibration_service=get_calibration_service())

predictor = Predictor(model_path, Config.CONFIDENCE_THRESHOLD)
processor = ResultProcessor()


GRID_ROWS = getattr(Config, "GRID_ROWS", 8)
GRID_COLS = getattr(Config, "GRID_COLS", 12)


class CalibrationBounds(BaseModel):
    left: float = Field(..., description="จุดซ้ายสุดของกริด (พิกเซล)")
    right: float = Field(..., description="จุดขวาสุดของกริด (พิกเซล)")
    top: float = Field(..., description="จุดบนสุดของกริด (พิกเซล)")
    bottom: float = Field(..., description="จุดล่างสุดของกริด (พิกเซล)")


class CalibrationRequest(BaseModel):
    image_width: int = Field(..., gt=0)
    image_height: int = Field(..., gt=0)
    bounds: CalibrationBounds
    columns: List[float] = Field(..., description="ตำแหน่งเส้นแนวตั้งทั้งหมด (พิกเซล)")
    rows: List[float] = Field(..., description="ตำแหน่งเส้นแนวนอนทั้งหมด (พิกเซล)")

    @validator("columns")
    def validate_columns(cls, value: List[float]) -> List[float]:
        expected = GRID_COLS + 1
        if len(value) != expected:
            raise ValueError(f"Columns must contain {expected} positions")
        return value

    @validator("rows")
    def validate_rows(cls, value: List[float]) -> List[float]:
        expected = GRID_ROWS + 1
        if len(value) != expected:
            raise ValueError(f"Rows must contain {expected} positions")
        return value


class CalibrationResponse(BaseModel):
    enabled: bool
    bounds: Optional[CalibrationBounds] = None
    columns: Optional[List[float]] = None
    rows: Optional[List[float]] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    updated_at: Optional[str] = None


def _to_pixel_grid(config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    image_width = config.get("image_width")
    image_height = config.get("image_height")
    if not image_width or not image_height:
        return None
    cal_service = get_calibration_service()
    grid = cal_service.get_grid((int(image_height), int(image_width)))
    return {
        "bounds": CalibrationBounds(**grid.get("bounds", {})),
        "columns": grid.get("columns", []),
        "rows": grid.get("rows", []),
        "image_width": image_width,
        "image_height": image_height,
        "updated_at": config.get("updated_at"),
    }


@router.get("/calibration", response_model=CalibrationResponse)
async def get_calibration_config(user: Dict[str, Any] = Depends(verify_token)):
       
    cal_service = get_calibration_service()
    config = cal_service.get_config()
    if not config:
        return CalibrationResponse(enabled=False)
    grid = _to_pixel_grid(config)
    if not grid:
        return CalibrationResponse(enabled=False)
    return CalibrationResponse(enabled=True, **grid)


@router.post("/calibration", response_model=CalibrationResponse)
async def save_calibration_config(
    payload: CalibrationRequest,
    user: Dict[str, Any] = Depends(verify_token),
):
       
    try:
        cal_service = get_calibration_service()
        saved = cal_service.save(
            image_width=payload.image_width,
            image_height=payload.image_height,
            bounds=payload.bounds.dict(),
            columns=payload.columns,
            rows=payload.rows,
        )
        grid = _to_pixel_grid(saved)
        if not grid:
            return CalibrationResponse(enabled=False)
        return CalibrationResponse(enabled=True, **grid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Failed to save calibration config: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save calibration configuration")


@router.delete("/calibration", response_model=CalibrationResponse)
async def clear_calibration_config(user: Dict[str, Any] = Depends(verify_token)):
       
    cal_service = get_calibration_service()
    cal_service.clear()
    return CalibrationResponse(enabled=False)

@router.post("/predict")
async def predict_endpoint(
    request: Request,
    sample_no: str = Form(...),
    submission_no: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    model_version: Optional[str] = Form(None),
    confidence_threshold: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    priority: Optional[int] = Form(5),
    user: Dict[str, Any] = Depends(verify_token)
):
    """
    Async prediction endpoint - returns immediately with run_id
    Actual inference happens in background worker.
    Accepts either 'file' (multipart upload) or 'image_path' (pre-uploaded PVC path).
    """
    if not file and not image_path:
        raise HTTPException(status_code=422, detail="Either 'file' or 'image_path' is required")

    logger.info("Starting async prediction for sample_no=%s", sample_no)
    start_time = time.time()

    # Step 2: Get JWT token for image service
    jwt_token = None
    if hasattr(request, 'headers') and 'authorization' in request.headers:
        auth_header = request.headers['authorization']
        if auth_header.startswith('Bearer '):
            jwt_token = auth_header[7:]

    file_path = None
    minio_raw_path = None

    if image_path:
        # Fast path: image already pre-uploaded to PVC storage
        minio_raw_path = image_path
        logger.info("Using pre-uploaded image path (fast path): %s", minio_raw_path)
    else:
        # Normal path: receive file upload, save to /tmp, then upload to PVC
        # Step 1: Save file to /tmp (temporary)
        upload_dir = getattr(Config, 'UPLOAD_DIR', '/tmp')
        os.makedirs(upload_dir, exist_ok=True)
        image_id = uuid.uuid4().hex
        filename = f"{image_id}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        logger.info("Uploaded file saved to %s", file_path)

        # Step 3: Upload to Image Service FIRST (CRITICAL!)
        # Must upload before creating PredictionRun to ensure workers can access the image
        upload_result = {}
        try:
            upload_result = await image_uploader.upload_image(
                sample_no=sample_no,
                run_id=0,
                file_path=file_path,
                file_type="raw",
                description=description or "original image",
                jwt_token=jwt_token
            )

            if upload_result.get('success') and upload_result.get('data', {}).get('filePath'):
                minio_raw_path = upload_result['data']['filePath']
                logger.info("Original image uploaded to PVC storage: %s", minio_raw_path)
            else:
                logger.error("Failed to upload image to storage: %s", upload_result)
                raise HTTPException(
                    status_code=500,
                    detail="Failed to upload image to storage. Please try again."
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to upload original image to image-ingestion-service: %s", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload image to storage: {str(e)}"
            )

    # Step 4: Create PredictionRun with PVC path (NOT /tmp path!)
    run_data = {
        "sampleNo": sample_no,
        "submissionNo": submission_no,
        "description": description,
        "rawImagePath": minio_raw_path,  # Use PVC path, not /tmp path!
        "modelVersion": model_version or Config.MODEL_VERSION,
        "status": "pending",
        "confidenceThreshold": confidence_threshold or Config.CONFIDENCE_THRESHOLD,
        "createdBy": user.get('id')
    }

    try:
        run_response = await db_service.create_prediction_run(run_data)
        run_id = run_response["data"]["id"]
        logger.info("Created PredictionRun id=%s with PVC path: %s", run_id, minio_raw_path)
    except Exception as e:
        logger.error(f"Failed to create prediction run: {e}")
        raise HTTPException(status_code=500, detail="Failed to create prediction run")

    # Publish job to RabbitMQ queue
    from app.services.queue_service import queue_service

    # Get calibration config to send with job (worker runs in separate container)
    cal_service = get_calibration_service()
    calibration_config = cal_service.get_config()

    job_data = {
        "run_id": run_id,
        "sample_no": sample_no,
        "submission_no": submission_no,
        "image_path": minio_raw_path or file_path,
        "local_image_path": file_path,  # None when using fast path (pre-uploaded)
        "model_version": model_version or Config.MODEL_VERSION,
        "confidence_threshold": confidence_threshold or Config.CONFIDENCE_THRESHOLD,
        "description": description,
        "priority": priority if isinstance(priority, int) and 1 <= priority <= 10 else 5,
        "created_by": user.get('id'),
        "jwt_token": jwt_token,
        "calibration_config": calibration_config  # Send calibration to worker
    }

    success = queue_service.publish_inference_job(job_data)

    if not success:
        # Fallback: update status to failed
        try:
            await db_service.update_prediction_run(run_id, {
                "status": "failed",
                "errorMsg": "Failed to queue inference job"
            })
        except Exception as update_error:
            logger.error(f"Failed to update run status: {update_error}")

        raise HTTPException(status_code=500, detail="Failed to queue inference job")

    # Return immediately with run_id
    response_time_ms = int((time.time() - start_time) * 1000)

    response = {
        'success': True,
        'data': {
            'run_id': run_id,
            'sample_no': sample_no,
            'submission_no': submission_no,
            'status': 'pending',
            'queued_at': time.time(),
            'response_time_ms': response_time_ms,
            'message': 'Inference job queued successfully. Use /status/{run_id} to check progress or listen to WebSocket for real-time updates.',
            'priority': job_data['priority']
        }
    }

    logger.info(f"Async prediction endpoint completed in {response_time_ms}ms for run_id={run_id}")
    return JSONResponse(status_code=202, content=response)  # 202 Accepted

@router.get("/queue/stats")
async def get_queue_stats(user: Dict[str, Any] = Depends(verify_token)):
    """Get RabbitMQ queue statistics"""
    try:
        from app.services.queue_service import queue_service
        stats = queue_service.get_queue_stats()

        if stats is None:
            raise HTTPException(status_code=503, detail="Failed to get queue stats")

        return JSONResponse(status_code=200, content={
            "success": True,
            "data": stats
        })
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get queue statistics")


@router.get("/models")
async def get_models(user: Dict[str, Any] = Depends(verify_token)):
                                                       
    try:
                                    
        model_path = getattr(Config, 'MODEL_PATH', None)
        model_exists = os.path.exists(model_path) if model_path else False
        
        models = {
            "available_models": [
                {
                    "version": Config.MODEL_VERSION,
                    "path": model_path,
                    "status": "available" if model_exists else "not_found",
                    "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
                    "nms_threshold": Config.NMS_THRESHOLD
                }
            ],
            "default_version": Config.MODEL_VERSION,
            "gpu_enabled": Config.ENABLE_GPU
        }
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "data": models
        })
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model information")

@router.get("/status/{run_id}")
async def get_status(run_id: int, user: Dict[str, Any] = Depends(verify_token)):
                                            
    try:
                                                 
        run_data = await db_service.get_prediction_run(run_id)
        
        response = {
            "success": True,
            "data": {
                "run_id": run_id,
                "status": (run_data.get("run") or run_data.get("data", {})).get("status"),
                "created_at": (run_data.get("run") or run_data.get("data", {})).get("createdAt"),
                "updated_at": (run_data.get("run") or run_data.get("data", {})).get("updatedAt")
            }
        }
        
        return JSONResponse(status_code=200, content=response)
    except Exception as e:
        logger.error(f"Error getting status for run {run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get run status")

@router.get("/images/{run_id}/annotated")
async def get_annotated_image(run_id: int, user: Dict[str, Any] = Depends(verify_token)):
                                        
    try:
                                                 
        run_data = await db_service.get_prediction_run(run_id)
        run_obj = (run_data.get("run") or run_data.get("data", {}))
        annotated_path = run_obj.get("annotatedImagePath")
        
        if not annotated_path or not os.path.exists(annotated_path):
            raise HTTPException(status_code=404, detail="Annotated image not found")
        
        from fastapi.responses import FileResponse
        return FileResponse(annotated_path, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving annotated image for run {run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve annotated image")

@router.get("/health")
async def health_check():
        
    try:
        db_health = await db_service.health_check()
        db_healthy = db_health.get("status") == "healthy"
        
        overall_status = "healthy" if db_healthy else "unhealthy"
        
        return JSONResponse(status_code=200, content={
            "success": True,
            "data": {
                "status": overall_status,
                "timestamp": time.time(),
                "services": {
                    "prediction_db_service": {
                        "status": db_health.get("status", "unknown"),
                        "healthy": db_healthy,
                        "details": db_health
                    }
                }
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(status_code=503, content={
            "success": False,
            "data": {
                "status": "unhealthy",
                "error": str(e)
            }
        })
