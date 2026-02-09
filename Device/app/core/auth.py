import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthService:
    def __init__(self):
        self.secret_key = settings.JWT_SECRET
        self.algorithm = settings.JWT_ALGORITHM
        self.issuer = settings.JWT_ISSUER
        self.audience = settings.JWT_AUDIENCE
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                issuer=self.issuer,
                audience=self.audience,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True
                }
            )
            
            logger.debug(f"Token verified successfully for user: {payload.get('sub', 'unknown')}")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "TOKEN_EXPIRED",
                        "message": "Token has expired"
                    }
                }
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "Invalid token"
                    }
                }
            )
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "AUTH_ERROR",
                        "message": "Authentication failed"
                    }
                }
            )


auth_service = AuthService()


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "MISSING_TOKEN",
                    "message": "Authorization token is required"
                }
            }
        )
    
    return auth_service.verify_token(credentials.credentials)


async def verify_token_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    
    try:
        return auth_service.verify_token(credentials.credentials)
    except HTTPException:
        return None
