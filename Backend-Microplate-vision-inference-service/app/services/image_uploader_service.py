   
import os
import logging
from typing import Optional, Dict, Any
import httpx

from app.config import Config

logger = logging.getLogger(__name__)

class ImageUploaderService:
    def __init__(self) -> None:
        base = getattr(Config, 'IMAGE_SERVICE_URL', None)
        if not base:
            raise RuntimeError('IMAGE_SERVICE_URL is not configured')

        self.base_url = base.rstrip('/')
        # Public URL that image-ingestion-service uses for signed URLs
        # This needs to be replaced with internal URL for container-to-container communication
        self.public_url = getattr(Config, 'PUBLIC_IMAGE_SERVICE_URL', '').rstrip('/') or None
        self.timeout_seconds = 60.0
        # Shared client with connection pooling for keep-alive reuse
        self._client = httpx.AsyncClient(
            timeout=self.timeout_seconds,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )

    async def upload_image(
        self,
        *,
        sample_no: str,
        run_id: int,
        file_path: str,
        file_type: str,
        description: Optional[str] = None,
        jwt_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        if file_type not in ("raw", "annotated", "thumbnail", "csv"):
            raise ValueError("file_type must be one of: raw, annotated, thumbnail, csv")

        # Use new unified files API endpoint
        url = f"{self.base_url}/api/v1/ingestion/files/upload"
        logger.debug("Uploading file to %s (sampleNo=%s, run_id=%s, type=%s, path=%s)", url, sample_no, run_id, file_type, file_path)

        # New API uses different field names
        form_fields = {
            'sampleNo': str(sample_no),
            'runId': str(run_id),
            'type': str(file_type),
            'description': description or '',
        }

        filename = os.path.basename(file_path)
        mime_type = 'image/jpeg'
        if filename.lower().endswith('.png'):
            mime_type = 'image/png'
        elif filename.lower().endswith('.webp'):
            mime_type = 'image/webp'
        elif filename.lower().endswith(('.tif', '.tiff')):
            mime_type = 'image/tiff'

                                                    
        headers = {}
        if jwt_token:
            headers['Authorization'] = f'Bearer {jwt_token}'

        with open(file_path, 'rb') as f:
            files = {
                'file': (filename, f, mime_type)
            }
            resp = await self._client.post(url, data=form_fields, files=files, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            logger.info("Uploaded file to image-ingestion-service (PVC storage): %s", data.get('data', {}))
            return data

    async def download_image_from_pvc(
        self,
        *,
        file_path: str,
        destination: str,
        jwt_token: Optional[str] = None,
    ) -> bool:
        """
        Download image from PVC storage via image-ingestion-service (direct path endpoint).

        Uses the /download-by-path endpoint for single-request download instead of
        listing all files + getting signed URL + downloading (3 round-trips → 1).

        Args:
            file_path: PVC file path (e.g., 'raw-images/SP1003/SP1003_...jpg')
            destination: Local path to save downloaded file
            jwt_token: Optional JWT token for authentication (not used currently)

        Returns:
            True if download successful, False otherwise
        """
        try:
            url = f"{self.base_url}/api/v1/ingestion/files/download-by-path"
            logger.info(f"Downloading image via direct path: {file_path}")

            resp = await self._client.get(url, params={"path": file_path})
            resp.raise_for_status()

            # Save to destination
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            with open(destination, 'wb') as f:
                f.write(resp.content)

            logger.info(f"Downloaded image from PVC to {destination} ({len(resp.content)} bytes)")
            return True

        except Exception as e:
            logger.error(f"Failed to download image from PVC: {e}")
            return False

    async def close(self) -> None:
        """Close the shared HTTP client (call on shutdown)."""
        await self._client.aclose()

image_uploader = ImageUploaderService()
