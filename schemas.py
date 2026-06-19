from pydantic import BaseModel, Field
from typing import Optional, List

class PatientContext(BaseModel):
    symptoms: Optional[str] = Field(None, description="Health issues or symptoms described by the user.")
    age: Optional[int] = Field(None, description="Age of the patient.")
    duration_days: Optional[int] = Field(None, description="Number of days the problem has been persisting.")
    location: Optional[str] = Field(None, description="Extracted city, exact locality, or explicit coordinates.")
    care_intent: Optional[str] = Field(None, description="E.g., General consultation, Surgery/Operation, Emergency room.")
    budget: Optional[str] = Field("Flexible", description="Budget tier or insurance restrictions.")
    detected_language: Optional[str] = Field("en", description="The conversation language code determined from history: 'en', 'hi', or 'hinglish'.")
    
    is_context_complete: bool = Field(
        description="True ONLY if symptoms, age, location, and care_intent are fully extracted."
    )
    follow_up_question: Optional[str] = Field(
        None, description="Compassionate, natural follow-up question if is_context_complete is False."
    )

class ScrapedHospitalData(BaseModel):
    name: str
    source: str
    raw_text: str
    url: Optional[str] = None
    rating: Optional[float] = None

class HospitalRecommendation(BaseModel):
    hospital_name: str
    ranking_position: int
    confidence_score: float = Field(description="Score between 0.0 and 1.0 reflecting matching reliability.")
    estimated_cost: str = Field(description="E.g., Moderate (₹₹), High (₹₹₹), or exact range if found.")
    distance: str = Field(description="Calculated distance relative to user location.")
    trust_score: float = Field(description="Derived from official accreditations (NABH) and user reviews.")
    suitability: str = Field(description="Quick summary matching the specific query.")
    explanation: str = Field(description="Detailed reason answering 'Why was this hospital ranked here?'")
    latitude: Optional[float] = Field(None, description="Latitude coordinate of the hospital facility.")
    longitude: Optional[float] = Field(None, description="Longitude coordinate of the hospital facility.")

class FinalResearchResult(BaseModel):
    recommended_hospitals: List[HospitalRecommendation]

# --- FastAPI Integration Server Contracts ---
class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique identifier to maintain multi-turn chat persistence.")
    user_input: str = Field(..., description="The message sent by the user.")

class ChatResponse(BaseModel):
    session_id: str
    is_complete: bool = Field(description="Indicates whether the system has completed its research phase.")
    message: str = Field(description="The conversational text response (follow-up question or summary).")
    data: Optional[FinalResearchResult] = Field(default=None, description="The ranked hospital results matrix.")