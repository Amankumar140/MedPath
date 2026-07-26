import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.schemas import (
    ContextRequest,
    ExtractedPatientContext,
    SufficiencyValidation,
    BrowserLocation
)
from app.tools import merge_patient_contexts
from app.memory import RedisMemoryManager, ConversationState

def test_merge_patient_contexts():
    existing = {
        "symptoms": ["headache"],
        "age": 30
    }
    newly = ExtractedPatientContext(
        symptoms=["fever"],
        duration="2 days",
        severity="moderate"
    )
    loc = BrowserLocation(city="Mumbai", latitude=19.076, longitude=72.8777)
    
    merged = merge_patient_contexts(existing, newly, loc)
    
    assert set(merged["symptoms"]) == {"headache", "fever"}
    assert merged["age"] == 30
    assert merged["duration"] == "2 days"
    assert merged["severity"] == "moderate"
    assert merged["browser_location"]["city"] == "Mumbai"

@pytest.mark.asyncio
async def test_redis_memory_manager_miss():
    manager = RedisMemoryManager()
    mock_client = AsyncMock()
    mock_client.get.return_value = None
    manager.redis_client = mock_client

    state = await manager.get_conversation("conv_123")
    assert state.conversation_id == "conv_123"
    assert state.chat_history == []
    assert state.structured_context == {}

@pytest.mark.asyncio
async def test_redis_memory_manager_hit():
    manager = RedisMemoryManager()
    mock_client = AsyncMock()
    mock_client.get.return_value = '{"conversation_id": "conv_123", "chat_history": [{"role": "user", "content": "hi"}], "structured_context": {"symptoms": ["cough"]}, "missing_fields": []}'
    manager.redis_client = mock_client

    state = await manager.get_conversation("conv_123")
    assert state.conversation_id == "conv_123"
    assert len(state.chat_history) == 1
    assert state.structured_context["symptoms"] == ["cough"]
