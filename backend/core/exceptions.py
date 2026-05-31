from fastapi import HTTPException, status

class SwasthyaAIException(Exception):
    """Base framework exception for Swasthya AI"""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

class MedicalIntentExtractionError(SwasthyaAIException):
    """Raised when LLM fallback stack fails to parse structured user symptoms"""
    def __init__(self, message: str = "Failed to evaluate clinical context and medical symptoms."):
        super().__init__(message, code="MEDICAL_INTENT_ERROR")

class IntegrationProviderError(SwasthyaAIException):
    """Raised when critical upstream components (Google Maps, Tavily, Supabase) time out or fail"""
    def __init__(self, provider: str, message: str):
        super().__init__(f"Upstream provider [{provider}] failure: {message}", code="INTEGRATION_ERROR")

class AuthenticationError(HTTPException):
    """Raised when Firebase Bearer Token claims fail mapping or parsing verification"""
    def __init__(self, detail: str = "Invalid or expired Firebase Auth Token credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class EntityNotFoundError(HTTPException):
    """Unified Not Found resource exception layer"""
    def __init__(self, entity_name: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requested asset reference '{entity_name}' with ID [{identifier}] does not exist."
        )