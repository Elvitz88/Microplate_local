                 
from dotenv import load_dotenv
import os
from pathlib import Path
from typing import List

                                               
base_services = Path(__file__).resolve().parents[2]

                           
common_env = base_services / ".env"
if common_env.exists():
    
    is_docker = Path("/.dockerenv").exists()
    load_dotenv(dotenv_path=common_env, override=not is_docker)

                                    
service_root = Path(__file__).resolve().parents[1]
service_env = service_root / ".env"
if service_env.exists():
    
    is_docker = Path("/.dockerenv").exists()
    load_dotenv(dotenv_path=service_env, override=not is_docker)


def _parse_csv(value: str | None, fallback: str | None = None) -> List[str]:
    items: List[str] = []
    if value:
        items = [item.strip() for item in value.split(',') if item.strip()]
    if not items and fallback:
        items = [fallback]
    return items

class Config:
                          
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    CONNECTION_TIMEOUT: int = int(os.getenv("CONNECTION_TIMEOUT", "10"))
    READ_TIMEOUT: int = int(os.getenv("READ_TIMEOUT", "30"))

                     
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "0.0")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp")
    
    _model_path_raw: str = os.getenv("MODEL_PATH", "")
    if _model_path_raw:
        
        normalized = _model_path_raw.replace("\\", "/").replace("D:", "").replace("C:", "")
       
        if "Microplate_Services" in normalized:
            normalized = normalized.split("app/models")[-1] if "app/models" in normalized else normalized
            normalized = "/app/models" + normalized if not normalized.startswith("/app") else normalized
        MODEL_PATH: str = normalized
    else:
        MODEL_PATH: str = "/app/models/best_model/best_yolov12x_microplate_v2.0.0.pt"
    PORT: int = int(os.getenv("PORT", "6403"))

                  
    
    IMAGE_SERVICE_URL: str = os.getenv("IMAGE_SERVICE_URL", "http://microplate-image-ingestion-service:6402")
    # Public URL used by image-ingestion-service for signed URLs (need to replace with internal URL)
    PUBLIC_IMAGE_SERVICE_URL: str = os.getenv("PUBLIC_IMAGE_SERVICE_URL", "")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:6400")
    
    PREDICTION_DB_SERVICE_URL: str = os.getenv("PREDICTION_DB_SERVICE_URL", "http://microplate-prediction-db-service:6406")

                              
    MAX_CONCURRENT_INFERENCES: int = int(os.getenv("MAX_CONCURRENT_INFERENCES", "5"))
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
    NMS_THRESHOLD: float = float(os.getenv("NMS_THRESHOLD", "0.4"))
    ENABLE_GPU: bool = os.getenv("ENABLE_GPU", "false").lower() == "true"
    GPU_DEVICE_ID: int = int(os.getenv("GPU_DEVICE_ID", "0"))

                                      
    CALIBRATION_CONFIG_PATH: str = os.getenv("CALIBRATION_CONFIG_PATH", "config/roi_calibration.json")
    DEFAULT_GRID_WIDTH: int = int(os.getenv("DEFAULT_GRID_WIDTH", "1700"))
    DEFAULT_GRID_HEIGHT: int = int(os.getenv("DEFAULT_GRID_HEIGHT", "1200"))
    GRID_ROWS: int = int(os.getenv("GRID_ROWS", "8"))
    GRID_COLS: int = int(os.getenv("GRID_COLS", "12"))


    CORS_ALLOWED_ORIGINS: List[str] = _parse_csv(
        os.getenv("CORS_ALLOWED_ORIGINS"),
        "http://localhost:6410"
    )


    RABBITMQ_HOST: str = os.getenv("RABBITMQ_SERVICE_HOST", os.getenv("RABBITMQ_HOST", "rabbitmq"))
    RABBITMQ_PORT: int = int(os.getenv("RABBITMQ_AMQP_PORT", "5672"))
    RABBITMQ_USER: str = os.getenv("RABBITMQ_USER", "microplate")
    RABBITMQ_PASS: str = os.getenv("RABBITMQ_PASS", "microplate123")
    RABBITMQ_QUEUE: str = os.getenv("RABBITMQ_QUEUE", "vision-inference")
