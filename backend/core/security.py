import secrets
from typing import Optional
from fastapi.security import HTTPBearer
from fastapi import Request

class FirebaseBearerScheme(HTTPBearer):
    """Enforces explicit Authorization header structure checking before passing token execution downstream"""
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials = await super().__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                return None
            return credentials.credentials
        return None

security_scheme = FirebaseBearerScheme()

def generate_secure_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)