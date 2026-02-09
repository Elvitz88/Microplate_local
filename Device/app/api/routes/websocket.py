import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status

from app.core.websocket_manager import WebSocketManager
from app.core.auth import verify_token_optional

logger = logging.getLogger(__name__)

router = APIRouter()


def get_websocket_manager() -> WebSocketManager:
    from main import websocket_manager
    if websocket_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebSocket manager not available"
        )
    return websocket_manager


@router.websocket("/capture")
async def websocket_capture_endpoint(
    websocket: WebSocket,
    websocket_manager: WebSocketManager = Depends(get_websocket_manager)
):
    client_info = None
    
    try:
        client_info = {
            "user_agent": websocket.headers.get("user-agent", "unknown"),
            "remote_addr": websocket.client.host if websocket.client else "unknown"
        }

        await websocket_manager.connect(websocket, client_info)
        
        logger.info(f"WebSocket connected: {client_info}")
        
        await websocket_manager.send_personal_message({
            "type": "initial_status",
            "message": "Connected to Vision Capture Service",
            "data": {
                "service_name": "Vision Capture Service",
                "version": "1.0.0",
                "connection_count": websocket_manager.get_connection_count()
            }
        }, websocket)
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                await handle_websocket_message(websocket, message, websocket_manager)
                
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client")
                break
            except json.JSONDecodeError:
                logger.warning("Invalid JSON received from WebSocket client")
                await websocket_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            except Exception as e:
                logger.error(f"WebSocket message handling error: {e}")
                await websocket_manager.send_personal_message({
                    "type": "error",
                    "message": f"Message handling error: {str(e)}"
                }, websocket)
    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        websocket_manager.disconnect(websocket)
        logger.info("WebSocket connection cleaned up")


async def handle_websocket_message(
    websocket: WebSocket,
    message: Dict[str, Any],
    websocket_manager: WebSocketManager
):
    message_type = message.get("type", "unknown")
    
    try:
        if message_type == "ping":
            await websocket_manager.send_personal_message({
                "type": "pong",
                "timestamp": message.get("timestamp")
            }, websocket)
        
        elif message_type == "status_request":
            from main import status_service
            if status_service:
                service_status = await status_service.get_service_status()
                await websocket_manager.send_personal_message({
                    "type": "status_response",
                    "data": service_status.dict()
                }, websocket)
        
        elif message_type == "camera_status_request":
            from main import camera_service
            if camera_service:
                camera_status = await camera_service.get_status()
                await websocket_manager.send_personal_message({
                    "type": "camera_status_response",
                    "data": camera_status.dict()
                }, websocket)
        
        elif message_type == "connection_info_request":
            connection_info = websocket_manager.get_connection_info()
            await websocket_manager.send_personal_message({
                "type": "connection_info_response",
                "data": {
                    "connection_count": websocket_manager.get_connection_count(),
                    "connections": connection_info
                }
            }, websocket)
        
        else:
            await websocket_manager.send_personal_message({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }, websocket)
    
    except Exception as e:
        logger.error(f"Error handling WebSocket message: {e}")
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Message handling error: {str(e)}"
        }, websocket)


@router.websocket("/status")
async def websocket_status_endpoint(
    websocket: WebSocket,
    websocket_manager: WebSocketManager = Depends(get_websocket_manager)
):
    try:
        await websocket_manager.connect(websocket)
        
        from main import status_service
        if status_service:
            service_status = await status_service.get_service_status()
            await websocket_manager.send_personal_message({
                "type": "status_update",
                "data": service_status.dict()
            }, websocket)
        
        while True:
            try:
                await asyncio.sleep(30)

                await websocket_manager.send_personal_message({
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
            except WebSocketDisconnect:
                break
    
    except WebSocketDisconnect:
        logger.info("Status WebSocket disconnected")
    except Exception as e:
        logger.error(f"Status WebSocket error: {e}")
    finally:
        websocket_manager.disconnect(websocket)
