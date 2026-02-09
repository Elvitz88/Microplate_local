   

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable

from app.core.config import settings
from app.models.schemas import ServiceStatus, CameraStatus

logger = logging.getLogger(__name__)


class StatusService:
                                                            
    
    def __init__(self):
        self.start_time = time.time()
        self.is_monitoring = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.status_callbacks: list[Callable[[ServiceStatus], None]] = []
        self.last_status_check = datetime.now()
        self.camera_service: Optional[Any] = None                    
        self.websocket_manager: Optional[Any] = None                    
    
    def set_camera_service(self, camera_service):
                                          
        self.camera_service = camera_service
    
    def set_websocket_manager(self, websocket_manager):
                                             
        self.websocket_manager = websocket_manager
    
    def add_status_callback(self, callback: Callable[[ServiceStatus], None]):
                                             
        self.status_callbacks.append(callback)
    
    async def start_monitoring(self):
                                     
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Status monitoring started")
    
    async def stop_monitoring(self):
                                    
        if not self.is_monitoring:
            return
        
        self.is_monitoring = False
        
        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Status monitoring stopped")
    
    async def _monitoring_loop(self):
                                    
        while self.is_monitoring:
            try:
                await asyncio.sleep(settings.STATUS_CHECK_INTERVAL)
                
                                    
                status = await self.get_service_status()
                
                                        
                self.last_status_check = datetime.now()
                
                                  
                for callback in self.status_callbacks:
                    try:
                        callback(status)
                    except Exception as e:
                        logger.error(f"Status callback error: {e}")
                
                                                                    
                if self.websocket_manager:
                    await self.websocket_manager.broadcast_status_update(status.dict())
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Status monitoring error: {e}")
    
    async def get_service_status(self) -> ServiceStatus:
           
        try:
                              
            uptime = time.time() - self.start_time
            
                               
            camera_status = CameraStatus(
                is_connected=False,
                is_capturing=False,
                device_id=None,
                resolution=None,
                fps=None,
                last_capture=None,
                error_message="Camera service not available"
            )
            
            if self.camera_service:
                camera_status = await self.camera_service.get_status()
            
                                            
            websocket_connections = 0
            if self.websocket_manager:
                websocket_connections = self.websocket_manager.get_connection_count()
            
                                              
            overall_status = "healthy"
            if not camera_status.is_connected:
                overall_status = "degraded"
            if camera_status.error_message:
                overall_status = "unhealthy"
            
            return ServiceStatus(
                service_name="Vision Capture Service",
                version="1.0.0",
                status=overall_status,
                uptime=uptime,
                camera_status=camera_status,
                websocket_connections=websocket_connections,
                last_health_check=self.last_status_check
            )
            
        except Exception as e:
            logger.error(f"Failed to get service status: {e}")
            
                                 
            return ServiceStatus(
                service_name="Vision Capture Service",
                version="1.0.0",
                status="unhealthy",
                uptime=time.time() - self.start_time,
                camera_status=CameraStatus(
                    is_connected=False,
                    is_capturing=False,
                    device_id=None,
                    resolution=None,
                    fps=None,
                    last_capture=None,
                    error_message=f"Status check failed: {e}"
                ),
                websocket_connections=0,
                last_health_check=self.last_status_check
            )
    
    async def get_health_status(self) -> Dict[str, Any]:
           
        try:
            service_status = await self.get_service_status()
            
            health_details = {
                "uptime_seconds": service_status.uptime,
                "camera_connected": service_status.camera_status.is_connected,
                "camera_capturing": service_status.camera_status.is_capturing,
                "websocket_connections": service_status.websocket_connections,
                "last_health_check": service_status.last_health_check.isoformat(),
                "version": service_status.version
            }
            
                                             
            if service_status.camera_status.resolution:
                health_details["camera_resolution"] = service_status.camera_status.resolution
                health_details["camera_fps"] = service_status.camera_status.fps
            
                                      
            if service_status.camera_status.error_message:
                health_details["error"] = service_status.camera_status.error_message
            
            return {
                "success": True,
                "status": service_status.status,
                "timestamp": datetime.now().isoformat(),
                "details": health_details
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "success": False,
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "details": {
                    "error": str(e),
                    "uptime_seconds": time.time() - self.start_time
                }
            }
    
    async def get_system_info(self) -> Dict[str, Any]:
           
        try:
            import platform
            import psutil
            
            return {
                "system": {
                    "platform": platform.system(),
                    "platform_version": platform.version(),
                    "architecture": platform.machine(),
                    "processor": platform.processor(),
                    "hostname": platform.node()
                },
                "python": {
                    "version": platform.python_version(),
                    "implementation": platform.python_implementation()
                },
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent
                },
                "cpu": {
                    "count": psutil.cpu_count(),
                    "usage_percent": psutil.cpu_percent(interval=1)
                },
                "disk": {
                    "total": psutil.disk_usage('/').total,
                    "free": psutil.disk_usage('/').free,
                    "percent": psutil.disk_usage('/').percent
                }
            }
            
        except ImportError:
            logger.warning("psutil not available for system info")
            return {
                "system": {
                    "platform": platform.system(),
                    "platform_version": platform.version(),
                    "architecture": platform.machine()
                },
                "python": {
                    "version": platform.python_version(),
                    "implementation": platform.python_implementation()
                },
                "note": "Detailed system info requires psutil package"
            }
        except Exception as e:
            logger.error(f"Failed to get system info: {e}")
            return {"error": str(e)}
    
    def get_uptime(self) -> float:
                                           
        return time.time() - self.start_time
    
    def get_uptime_formatted(self) -> str:
                                         
        uptime = self.get_uptime()
        td = timedelta(seconds=uptime)
        
        days = td.days
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m {seconds}s"
        elif hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    async def cleanup(self):
                                    
        await self.stop_monitoring()
        logger.info("Status service cleaned up")
