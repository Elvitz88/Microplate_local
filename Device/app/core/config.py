import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    HOST: str = "0.0.0.0"
    PORT: int = 6407
    DEBUG: bool = False
    
    JWT_SECRET: str = "your-super-secret-access-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "microplate-auth-service"
    JWT_AUDIENCE: str = "microplate-api"
    
    CAMERA_DEVICE_ID: Optional[int] = None
    CAMERA_WIDTH: int = 1920
    CAMERA_HEIGHT: int = 1080
    CAMERA_FPS: int = 30
    
    CAPTURE_TIMEOUT: int = 30
    IMAGE_QUALITY: int = 95
    IMAGE_FORMAT: str = "JPEG"
    CAPTURE_RESIZE_WIDTH: Optional[int] = None
    CAPTURE_RESIZE_HEIGHT: Optional[int] = None
    CAPTURE_PERSIST_IMAGES: bool = True
    CAPTURE_IN_MEMORY_LIMIT: int = 10
    
    CAPTURE_DIR: str = "captures"
    MAX_CAPTURE_AGE_HOURS: int = 24
    
    STATUS_CHECK_INTERVAL: int = 5
    CONNECTION_TIMEOUT: int = 10
    
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "logs/vision-capture.log"
    
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS: int = 10

    CAMERA_BACKEND: str = "opencv"
    BASLER_SERIAL: Optional[str] = None
    BASLER_IP: Optional[str] = None
    BASLER_PACKET_SIZE: Optional[int] = None
    BASLER_EXPOSURE_US: Optional[int] = None
    BASLER_GAIN: Optional[float] = None
settings = Settings()
