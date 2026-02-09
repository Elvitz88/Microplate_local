

   

import asyncio
import logging
import os
import time
import threading
from collections import OrderedDict
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.core.config import settings
try:
    if settings.CAMERA_BACKEND == "pylon":
        from pypylon import pylon, genicam
except Exception:
    pass
from app.models.schemas import CameraStatus, ImageData, CaptureProgress

logger = logging.getLogger(__name__)


class CameraService:
                                                         
    
    def __init__(self):
        self.camera = None
        self.is_initialized = False
        self.is_capturing = False
        self.device_id = settings.CAMERA_DEVICE_ID
        self.width = settings.CAMERA_WIDTH
        self.height = settings.CAMERA_HEIGHT
        self.fps = settings.CAMERA_FPS
        self.last_capture_time: Optional[datetime] = None
        self.persist_images = getattr(settings, 'CAPTURE_PERSIST_IMAGES', True)
        self.capture_dir = Path(settings.CAPTURE_DIR)
        self.is_streaming = False
        self._streaming_stopped_event = threading.Event()  # Event to signal streaming has stopped
        self._camera_lock = threading.RLock()  # Lock for thread-safe camera access
        self._capture_stats = {
            "total_captures": 0,
            "successful_captures": 0,
            "failed_captures": 0,
            "capture_times": []
        }
        self._image_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
        self._in_memory_limit = max(1, int(getattr(settings, 'CAPTURE_IN_MEMORY_LIMIT', 10)))
        
                                                                 
        if self.persist_images:
            self.capture_dir.mkdir(parents=True, exist_ok=True)
    
    async def initialize(self) -> bool:





           
        try:
            logger.info(f"Initializing camera backend: {getattr(settings, 'CAMERA_BACKEND', 'opencv')}")

            if getattr(settings, 'CAMERA_BACKEND', 'opencv') == 'pylon':
                                               
                tl_factory = pylon.TlFactory.GetInstance()
                devices = tl_factory.EnumerateDevices()
                cam_info = None
                serial = getattr(settings, 'BASLER_SERIAL', None)
                ip = getattr(settings, 'BASLER_IP', None)
                if serial:
                    cam_info = next((d for d in devices if d.GetSerialNumber() == serial), None)
                if cam_info is None and ip:
                    cam_info = next((d for d in devices if d.GetIpAddress() == ip), None)
                if cam_info is None:
                    logger.error("No Basler camera matched BASLER_SERIAL or BASLER_IP")
                    return False

                self.camera = pylon.InstantCamera(tl_factory.CreateDevice(cam_info))
                self.camera.Open()

                nodemap = self.camera.GetNodeMap()
                                     
                try:
                    packet_size = getattr(settings, 'BASLER_PACKET_SIZE', None)
                    if packet_size:
                        packet = genicam.CIntegerPtr(nodemap.GetNode("GevSCPSPacketSize"))
                        if genicam.IsWritable(packet):
                            packet.SetValue(int(packet_size))
                except Exception:
                    pass

                try:
                    exposure_us = getattr(settings, 'BASLER_EXPOSURE_US', None)
                    if exposure_us:
                        exposure = genicam.CFloatPtr(nodemap.GetNode("ExposureTime"))
                        if genicam.IsWritable(exposure):
                            exposure.SetValue(float(exposure_us))
                except Exception:
                    pass

                try:
                    gain_val = getattr(settings, 'BASLER_GAIN', None)
                    if gain_val is not None:
                        gain = genicam.CFloatPtr(nodemap.GetNode("Gain"))
                        if genicam.IsWritable(gain):
                            gain.SetValue(float(gain_val))
                except Exception:
                    pass

                self.is_initialized = True
                logger.info("Basler camera initialized via pylon")
                return True

                                     
            logger.info(f"Initializing camera with device ID: {self.device_id}")

            self.camera = cv2.VideoCapture(self.device_id or 0)
            if not self.camera.isOpened():
                logger.error("Failed to open camera")
                return False

            # Set buffer size to 1 to minimize latency and get fresh frames
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            actual_buffer_size = int(self.camera.get(cv2.CAP_PROP_BUFFERSIZE))

            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.camera.set(cv2.CAP_PROP_FPS, self.fps)

            actual_width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = int(self.camera.get(cv2.CAP_PROP_FPS))

            logger.info(f"Camera initialized successfully:")
            logger.info(f"  Resolution: {actual_width}x{actual_height}")
            logger.info(f"  FPS: {actual_fps}")
            logger.info(f"  Buffer size: {actual_buffer_size}")

            self.is_initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Camera initialization failed: {e}")
            self.is_initialized = False
            return False
    
    async def get_status(self) -> CameraStatus:





           
        try:
            is_connected = self.is_initialized and self.camera is not None and self.camera.isOpened()
            
            if is_connected:
                actual_width = int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
                actual_fps = int(self.camera.get(cv2.CAP_PROP_FPS))
                resolution = f"{actual_width}x{actual_height}"
            else:
                resolution = None
                actual_fps = None
            
            return CameraStatus(
                is_connected=is_connected,
                is_capturing=self.is_capturing,
                device_id=self.device_id,
                resolution=resolution,
                fps=actual_fps,
                last_capture=self.last_capture_time,
                error_message=None
            )
            
        except Exception as e:
            logger.error(f"Failed to get camera status: {e}")
            return CameraStatus(
                is_connected=False,
                is_capturing=False,
                device_id=self.device_id,
                resolution=None,
                fps=None,
                last_capture=self.last_capture_time,
                error_message=str(e)
            )
    
    async def capture_image(
        self, 
        sample_no: str, 
        submission_no: Optional[str] = None,
        description: str = "Captured image",
        quality: int = 95
    ) -> Tuple[bool, Optional[ImageData], Optional[str]]:











           
        if not self.is_initialized or self.camera is None:
            return False, None, "Camera not initialized"
        
        if self.is_capturing:
            return False, None, "Capture already in progress"
        
        self.is_capturing = True
        start_time = time.time()
        
        try:
            logger.info(f"Starting image capture for sample: {sample_no}")

            # ถ้า caller ไม่ได้ระบุ quality มา (หรือส่งค่า 0 / None)
            # ให้ใช้ค่า default จาก .env (IMAGE_QUALITY) แทน hardcode
            try:
                if not quality or quality < 1 or quality > 100:
                    env_quality = int(getattr(settings, "IMAGE_QUALITY", 95))
                    if env_quality < 1 or env_quality > 100:
                        env_quality = 95
                    logger.debug(
                        "Using IMAGE_QUALITY from settings for capture: %s", env_quality
                    )
                    quality = env_quality
            except Exception:
                # ถ้าอ่านจาก settings ไม่ได้ ให้ fallback เป็น 95 ตามเดิม
                quality = 95

            # Stop streaming if it's active to ensure we get a fresh frame
            was_streaming = self.is_streaming
            if was_streaming:
                logger.info("Stopping streaming before capture")
                self._streaming_stopped_event.clear()  # Clear the event before stopping
                self.stop_streaming()
                # Wait for streaming to actually stop (with timeout)
                max_wait_time = 2.0  # Maximum 2 seconds wait
                wait_start = time.time()
                while self.is_streaming and (time.time() - wait_start) < max_wait_time:
                    await asyncio.sleep(0.05)  # Check every 50ms
                
                # Additional wait using event for synchronization
                self._streaming_stopped_event.wait(timeout=0.5)
                
                if self.is_streaming:
                    logger.warning("Streaming did not stop within timeout, proceeding anyway")
                else:
                    logger.info(f"Streaming stopped successfully after {time.time() - wait_start:.2f}s")


            if getattr(settings, 'CAMERA_BACKEND', 'opencv') == 'pylon':
                logger.info("🔄 Using Basler/pylon camera - CONTINUOUS GRABBING method for fresh frame")

                try:
                    # NEW APPROACH: Don't close/open camera, use continuous grabbing instead
                    # Stop grabbing if active
                    if self.camera.IsGrabbing():
                        self.camera.StopGrabbing()

                    # Start continuous grabbing with LatestImageOnly strategy (no delay needed)
                    self.camera.StartGrabbing(pylon.GrabStrategy_LatestImageOnly)

                    # CRITICAL: Flush old frames by grabbing and discarding frames
                    warmup_count = 5  # Optimized for speed (reduced from 10)
                    logger.info(f"🔥 Flushing {warmup_count} frames...")

                    for i in range(warmup_count):
                        grab = None
                        try:
                            # Use RetrieveResult to get and immediately discard frames
                            grab = self.camera.RetrieveResult(1000, pylon.TimeoutHandling_ThrowException)
                            if grab.GrabSucceeded():
                                pass  # Frame grabbed successfully, will be released in finally
                            await asyncio.sleep(0.01)  # 10ms between frames (optimized for speed)
                        except Exception as e:
                            logger.warning(f"  Warmup frame {i+1} failed: {e}")
                        finally:
                            # CRITICAL: Always release grab object to prevent buffer stuck
                            if grab is not None:
                                try:
                                    grab.Release()
                                except Exception:
                                    pass

                    # Now grab the FINAL fresh frame
                    logger.info("📸 Capturing FINAL fresh frame after buffer flush")
                    grab = self.camera.RetrieveResult(2000, pylon.TimeoutHandling_ThrowException)

                    if not grab.GrabSucceeded():
                        self.camera.StopGrabbing()
                        self.is_capturing = False
                        return False, None, "Failed to grab final image from Basler camera"

                    try:
                        converter = pylon.ImageFormatConverter()
                        converter.OutputPixelFormat = pylon.PixelType_BGR8packed
                        converter.OutputBitAlignment = pylon.OutputBitAlignment_MsbAligned
                        img = converter.Convert(grab)
                        frame = img.GetArray()

                        logger.info("✅ Captured fresh frame with continuous grabbing method")
                    finally:
                        grab.Release()
                        # Stop grabbing after capture
                        self.camera.StopGrabbing()

                except Exception as e:
                    if self.camera.IsGrabbing():
                        self.camera.StopGrabbing()
                    self.is_capturing = False
                    return False, None, f"Basler capture error: {str(e)}"
            else:
                # Use grab() and retrieve() for better buffer control
                # grab() will get the latest frame immediately
                flush_count = getattr(settings, 'CAMERA_BUFFER_FLUSH_COUNT', 10)
                logger.info(f"🔄 Flushing camera buffer with {flush_count} grabs to get fresh frame")

                # Flush the buffer by grabbing (but not retrieving) multiple frames
                for i in range(flush_count):
                    ret = self.camera.grab()
                    if not ret:
                        logger.warning(f"Failed to grab frame during buffer flush (attempt {i+1}/{flush_count})")
                    # Small delay to allow camera to capture new frame
                    await asyncio.sleep(0.03)  # 30ms delay between grabs

                # Now grab and retrieve the latest frame
                logger.info("📸 Grabbing final frame after buffer flush")
                if not self.camera.grab():
                    self.is_capturing = False
                    return False, None, "Failed to grab frame from camera"

                ret, frame = self.camera.retrieve()
                if not ret or frame is None:
                    self.is_capturing = False
                    return False, None, "Failed to retrieve frame from camera"

                logger.info("✅ Captured fresh frame after buffer flush")

            resize_width = getattr(settings, 'CAPTURE_RESIZE_WIDTH', None)
            resize_height = getattr(settings, 'CAPTURE_RESIZE_HEIGHT', None)
            if resize_width and resize_height:
                try:
                    frame = cv2.resize(frame, (int(resize_width), int(resize_height)), interpolation=cv2.INTER_AREA)
                    logger.debug("Resized captured frame to %sx%s", resize_width, resize_height)
                except Exception as resize_error:
                    logger.warning("Failed to resize frame, using original size: %s", resize_error)

                               
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"capture_{sample_no}_{timestamp}.jpg"
            
            if submission_no:
                filename = f"capture_{sample_no}_{submission_no}_{timestamp}.jpg"
            
            file_path = self.capture_dir / filename
            
            if self.persist_images:
                                    
                success = cv2.imwrite(str(file_path), frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
                
                if not success:
                    self.is_capturing = False
                    return False, None, "Failed to save image"
                
                                      
                height, width = frame.shape[:2]
                file_size = file_path.stat().st_size
                image_file_path_str = str(file_path)
            else:
                encode_success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
                if not encode_success:
                    self.is_capturing = False
                    return False, None, "Failed to encode image"

                image_bytes = buffer.tobytes()
                height, width = frame.shape[:2]
                file_size = len(image_bytes)
                image_file_path_str = filename

                self._image_cache[filename] = {
                    "bytes": image_bytes,
                    "size": file_size,
                    "width": width,
                    "height": height,
                    "captured_at": datetime.now(),
                }
                self._image_cache.move_to_end(filename)

                                     
                while len(self._image_cache) > self._in_memory_limit:
                    removed_filename, _ = self._image_cache.popitem(last=False)
                    logger.debug("Removed cached image due to limit: %s", removed_filename)

                               
            image_data = ImageData(
                filename=filename,
                file_path=image_file_path_str,
                file_size=file_size,
                width=width,
                height=height,
                format="JPEG",
                captured_at=datetime.now()
            )
            
                          
            capture_time = time.time() - start_time
            self._capture_stats["total_captures"] += 1
            self._capture_stats["successful_captures"] += 1
            self._capture_stats["capture_times"].append(capture_time)
            
                                                                      
            if len(self._capture_stats["capture_times"]) > 100:
                self._capture_stats["capture_times"] = self._capture_stats["capture_times"][-100:]
            
            self.last_capture_time = datetime.now()
            
            logger.info(f"Image captured successfully: {filename} ({file_size} bytes)")
            
            # Clear any remaining buffer after successful capture (OpenCV only)
            if getattr(settings, 'CAMERA_BACKEND', 'opencv') != 'pylon':
                try:
                    # Flush 3 more frames to clear buffer for next capture
                    for _ in range(3):
                        self.camera.grab()
                    logger.debug("Post-capture buffer cleared")
                except Exception as clear_err:
                    logger.debug(f"Post-capture buffer clear warning: {clear_err}")
            
            return True, image_data, None
            
        except Exception as e:
            logger.error(f"Image capture failed: {e}")
            self._capture_stats["failed_captures"] += 1
            return False, None, str(e)
        
        finally:
            self.is_capturing = False
    
    async def test_camera(self) -> Tuple[bool, Optional[str]]:





           
        try:
            if not self.is_initialized or self.camera is None:
                return False, "Camera not initialized"
            
                                
            if getattr(settings, 'CAMERA_BACKEND', 'opencv') == 'pylon':
                grab = self.camera.GrabOne(3000)
                if not grab.GrabSucceeded():
                    return False, "Failed to grab frame from Basler camera"
                converter = pylon.ImageFormatConverter()
                converter.OutputPixelFormat = pylon.PixelType_BGR8packed
                converter.OutputBitAlignment = pylon.OutputBitAlignment_MsbAligned
                frame = converter.Convert(grab).GetArray()
            else:
                ret, frame = self.camera.read()
                if not ret:
                    return False, "Failed to read frame from camera"
            
                                     
            if frame is None or frame.size == 0:
                return False, "Invalid frame received from camera"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Camera test failed: {e}")
            return False, str(e)
    
    async def get_capture_stats(self) -> Dict[str, Any]:





           
        stats = self._capture_stats.copy()
        
                                        
        if stats["capture_times"]:
            stats["average_capture_time"] = sum(stats["capture_times"]) / len(stats["capture_times"])
        else:
            stats["average_capture_time"] = None
        
                                
        if self.persist_images:
            storage_used = 0
            for file_path in self.capture_dir.glob("*.jpg"):
                storage_used += file_path.stat().st_size
        else:
            storage_used = sum(item["size"] for item in self._image_cache.values())
        
        stats["storage_used"] = storage_used
        stats["last_capture_time"] = self.last_capture_time
        
        return stats
    
    async def cleanup_captures(self, max_age_hours: int = None) -> int:








           
        if max_age_hours is None:
            max_age_hours = settings.MAX_CAPTURE_AGE_HOURS
        
        if self.persist_images:
            deleted_count = 0
            cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
            
            try:
                for file_path in self.capture_dir.glob("*.jpg"):
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1
                
                logger.info(f"Cleaned up {deleted_count} old capture files")
            except Exception as e:
                logger.error(f"Failed to cleanup captures: {e}")
            
            return deleted_count
        else:
            cutoff = datetime.now().timestamp() - (max_age_hours * 3600)
            keys_to_remove = [key for key, meta in self._image_cache.items() if meta["captured_at"].timestamp() < cutoff]
            for key in keys_to_remove:
                self._image_cache.pop(key, None)
            if keys_to_remove:
                logger.info("Cleaned up %s cached images", len(keys_to_remove))
            return len(keys_to_remove)
    
    async def cleanup(self):
                                      
        try:
            if self.camera is not None:
                self.camera.release()
                self.camera = None
            
            self.is_initialized = False
            self.is_capturing = False
            self.is_streaming = False
            
            logger.info("Camera service cleaned up")
            
        except Exception as e:
            logger.error(f"Camera cleanup error: {e}")

    def get_image_resource(self, filename: str) -> Optional[Dict[str, Any]]:

        if self.persist_images:
            file_path = self.capture_dir / filename
            if file_path.exists():
                return {"type": "file", "path": file_path}
        else:
            data = self._image_cache.get(filename)
            if data:
                return {"type": "memory", "bytes": data["bytes"]}
        return None

    def mjpeg_frame_iterator(self, quality: int = None, width: int = None, height: int = None, max_fps: int = None):


           
        if not self.is_initialized or self.camera is None:
            return

        jpeg_quality = int(quality or settings.IMAGE_QUALITY or 80)
        backend = getattr(settings, 'CAMERA_BACKEND', 'opencv')
        self._streaming_stopped_event.clear()  # Clear event when starting streaming
        self.is_streaming = True
        min_interval = None
        if max_fps and max_fps > 0:
            min_interval = 1.0 / float(max_fps)
        last_sent = 0.0

        try:
            if backend == 'pylon':
                                            
                try:
                    if not self.camera.IsGrabbing():
                        self.camera.StartGrabbing(pylon.GrabStrategy_LatestImageOnly)
                except Exception as e:
                    logger.error(f"Failed to start grabbing: {e}")
                    return

                converter = pylon.ImageFormatConverter()
                converter.OutputPixelFormat = pylon.PixelType_BGR8packed
                converter.OutputBitAlignment = pylon.OutputBitAlignment_MsbAligned

                while self.is_streaming:
                    try:
                        grab = self.camera.RetrieveResult(1000, pylon.TimeoutHandling_Return)
                        if grab is None:
                            continue
                        try:
                            if grab.GrabSucceeded():
                                img = converter.Convert(grab)
                                frame = img.GetArray()
                                                 
                                if width or height:
                                    h, w = frame.shape[:2]
                                    target_w, target_h = w, h
                                    if width and height:
                                        target_w, target_h = int(width), int(height)
                                    elif width and not height:
                                        scale = float(width) / float(w)
                                        target_w, target_h = int(width), int(h * scale)
                                    elif height and not width:
                                        scale = float(height) / float(h)
                                        target_w, target_h = int(w * scale), int(height)
                                    frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)

                                                                 
                                now = time.perf_counter()
                                if min_interval is not None and (now - last_sent) < min_interval:
                                    continue
                                ok, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
                                if ok:
                                    last_sent = time.perf_counter()
                                    yield buf.tobytes()
                        finally:
                            grab.Release()
                    except Exception:
                        continue
            else:
                                
                while self.is_streaming:
                    ret, frame = self.camera.read()
                    if not ret or frame is None:
                        time.sleep(0.001)
                        continue
                                     
                    if width or height:
                        h, w = frame.shape[:2]
                        target_w, target_h = w, h
                        if width and height:
                            target_w, target_h = int(width), int(height)
                        elif width and not height:
                            scale = float(width) / float(w)
                            target_w, target_h = int(width), int(h * scale)
                        elif height and not width:
                            scale = float(height) / float(h)
                            target_w, target_h = int(w * scale), int(height)
                        frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)

                    now = time.perf_counter()
                    if min_interval is not None and (now - last_sent) < min_interval:
                        time.sleep(min_interval - (now - last_sent))
                    ok, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
                    if ok:
                        last_sent = time.perf_counter()
                        yield buf.tobytes()
        finally:
            self.is_streaming = False
            self._streaming_stopped_event.set()  # Signal that streaming has stopped
            logger.debug("Streaming stopped, event signaled")

    def stop_streaming(self):
                                              
        self.is_streaming = False
        logger.debug("Stop streaming requested")
    
    def get_device_info(self) -> Dict[str, Any]:
                                           
        return {
            "device_id": self.device_id,
            "configured_resolution": f"{self.width}x{self.height}",
            "configured_fps": self.fps,
            "is_initialized": self.is_initialized,
            "is_capturing": self.is_capturing
        }
