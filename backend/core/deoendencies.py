from typing import Generator, Optional
from fastapi import Depends
from app.core.security import security_scheme
from app.auth.firebase_auth import verify_firebase_token  # Interface declaration stub
from app.db.session import SessionLocal  # Extracted mapping interface
from pydantic import BaseModel

class CurrentUserContext(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None

def get_db() -> Generator:
    """SQLAlchemy scoped session pool dependency yields connection blocks cleanly"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(security_scheme)) -> CurrentUserContext:
    """Dependency injection target enforcing strict security claims assessment on protected endpoints"""
    decoded_claims = await verify_firebase_token(token)
    return CurrentUserContext(
        uid=decoded_claims.get("uid"),
        email=decoded_claims.get("email"),
        display_name=decoded_claims.get("name")
    )