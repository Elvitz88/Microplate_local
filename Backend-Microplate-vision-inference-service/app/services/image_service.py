   
import logging
from typing import Any, Dict
import httpx

from app.config import Config

logger = logging.getLogger(__name__)

class ImageService:
    def __init__(self) -> None:
        base = getattr(Config, 'IMAGE_SERVICE_URL', '').rstrip('/')
        if not base:
            raise RuntimeError('IMAGE_SERVICE_URL is not configured')
        self.base_url = base
        self.timeout_seconds = 30.0

    async def create_image_file(self, image_data: Dict[str, Any], jwt_token: str = None) -> Dict[str, Any]:
                                                                 
        headers = {}
        if jwt_token:
            headers['Authorization'] = f'Bearer {jwt_token}'
            
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(f"{self.base_url}/api/v1/image-files", json=image_data, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def get_image_file(self, image_id: int) -> Dict[str, Any]:
                                         
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.get(f"{self.base_url}/api/v1/image-files/{image_id}")
            resp.raise_for_status()
            return resp.json()

    async def get_image_files_by_run_id(self, run_id: int) -> Dict[str, Any]:
                                       
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.get(f"{self.base_url}/api/v1/image-files/run/{run_id}")
            resp.raise_for_status()
            return resp.json()

    async def get_image_files_by_sample_no(self, sample_no: str) -> Dict[str, Any]:
                                              
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.get(f"{self.base_url}/api/v1/image-files/sample/{sample_no}")
            resp.raise_for_status()
            return resp.json()

    async def update_image_file(self, image_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
                                      
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.put(f"{self.base_url}/api/v1/image-files/{image_id}", json=update_data)
            resp.raise_for_status()
            return resp.json()

    async def delete_image_file(self, image_id: int) -> Dict[str, Any]:
                                      
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.delete(f"{self.base_url}/api/v1/image-files/{image_id}")
            resp.raise_for_status()
            return resp.json()

    async def delete_image_files_by_run_id(self, run_id: int) -> Dict[str, Any]:
                                          
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.delete(f"{self.base_url}/api/v1/image-files/run/{run_id}")
            resp.raise_for_status()
            return resp.json()
