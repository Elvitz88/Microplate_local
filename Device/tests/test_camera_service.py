"""
Tests for Camera Service
"""

import pytest
import asyncio
from unittest.mock import Mock, patch

from app.services.camera_service import CameraService


class TestCameraService:
    """Test cases for CameraService"""
    
    @pytest.fixture
    def camera_service(self):
        """Create camera service instance for testing"""
        return CameraService()
    
    @pytest.mark.asyncio
    async def test_camera_initialization(self, camera_service):
        """Test camera initialization"""
        # Mock OpenCV VideoCapture
        with patch('cv2.VideoCapture') as mock_capture:
            mock_camera = Mock()
            mock_camera.isOpened.return_value = True
            mock_camera.get.side_effect = lambda prop: {
                3: 1920,  # CAP_PROP_FRAME_WIDTH
                4: 1080,  # CAP_PROP_FRAME_HEIGHT
                5: 30     # CAP_PROP_FPS
            }.get(prop, 0)
            mock_capture.return_value = mock_camera
            
            result = await camera_service.initialize()
            
            assert result is True
            assert camera_service.is_initialized is True
    
    @pytest.mark.asyncio
    async def test_camera_status(self, camera_service):
        """Test camera status retrieval"""
        # Mock initialized camera
        camera_service.is_initialized = True
        camera_service.camera = Mock()
        camera_service.camera.isOpened.return_value = True
        camera_service.camera.get.side_effect = lambda prop: {
            3: 1920,  # CAP_PROP_FRAME_WIDTH
            4: 1080,  # CAP_PROP_FRAME_HEIGHT
            5: 30     # CAP_PROP_FPS
        }.get(prop, 0)
        
        status = await camera_service.get_status()
        
        assert status.is_connected is True
        assert status.is_capturing is False
        assert status.resolution == "1920x1080"
        assert status.fps == 30
    
    @pytest.mark.asyncio
    async def test_camera_not_initialized(self, camera_service):
        """Test camera status when not initialized"""
        camera_service.is_initialized = False
        
        status = await camera_service.get_status()
        
        assert status.is_connected is False
        assert status.is_capturing is False
        assert status.error_message is not None
    
    @pytest.mark.asyncio
    async def test_capture_image_not_initialized(self, camera_service):
        """Test image capture when camera not initialized"""
        camera_service.is_initialized = False
        
        success, image_data, error = await camera_service.capture_image("TEST001")
        
        assert success is False
        assert image_data is None
        assert error == "Camera not initialized"
    
    @pytest.mark.asyncio
    async def test_capture_image_already_capturing(self, camera_service):
        """Test image capture when already capturing"""
        camera_service.is_initialized = True
        camera_service.is_capturing = True
        
        success, image_data, error = await camera_service.capture_image("TEST001")
        
        assert success is False
        assert image_data is None
        assert error == "Capture already in progress"
    
    @pytest.mark.asyncio
    async def test_cleanup(self, camera_service):
        """Test camera cleanup"""
        camera_service.camera = Mock()
        camera_service.is_initialized = True
        
        await camera_service.cleanup()
        
        camera_service.camera.release.assert_called_once()
        assert camera_service.is_initialized is False
        assert camera_service.is_capturing is False
