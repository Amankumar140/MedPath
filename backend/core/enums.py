from enum import Enum

class UrgencyLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class OwnershipType(str, Enum):
    PRIVATE = "Private"
    PUBLIC = "Public"
    TRUST = "Trust"
    GOVERNMENT = "Government"

class LLMProvider(str, Enum):
    GEMINI = "gemini"
    MISTRAL = "mistral"

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"