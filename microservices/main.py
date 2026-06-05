import sys
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse,HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# Core engine imports
from agents.triage_agent import TriageAgent
from agents.research_agent import ResearchAgent
from agents.ranker_agent import RankerAgent  # New structural integration file
from schemas import PatientContext

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI()

# 1. Mount your root route to serve index.html
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSION_STORAGE = {}

# Instantiate agents
triage_coordinator = TriageAgent()
research_engine = ResearchAgent()
ranker_engine = RankerAgent()  # Initialize the ranker agent

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    user_input = body.get("user_input", "")
    session_id = body.get("session_id", "DEFAULT")

    if session_id not in SESSION_STORAGE:
        SESSION_STORAGE[session_id] = []
    
    conversation_history = SESSION_STORAGE[session_id]

    async def execution_stream():
        try:
            yield json.dumps({"type": "status", "message": "🔍 Parsing triage metrics and analyzing language parameters..."}) + "\n"
            
            # Execute current triage pass
            patient_context: PatientContext = triage_coordinator.analyze_input(user_input, conversation_history)
            conversation_history.append(("user", user_input))

            # Handle incomplete tracking profiles
            if not patient_context.is_context_complete:
                conversation_history.append(("ai", patient_context.follow_up_question))
                yield json.dumps({
                    "type": "final",
                    "is_complete": False,
                    "message": patient_context.follow_up_question,
                    "context": json.loads(patient_context.json())
                }) + "\n"
                return

            # Handle fully satisfied triage profiles
            yield json.dumps({"type": "status", "message": f"✅ Context complete for {patient_context.symptoms}! Initializing regional healthcare indexing..."}) + "\n"
            await asyncio.sleep(0.4)

            yield json.dumps({"type": "status", "message": f"🌐 Querying Tavily Search APIs for clinical departments in {patient_context.location}..."}) + "\n"
            
            # Gather live data via Tavily, Playwright, and Selenium
            raw_scraped_data = await research_engine.gather_all_data(
                query=patient_context.symptoms, 
                location=patient_context.location
            )
            
            yield json.dumps({"type": "status", "message": "🧮 Compiling web-scraped registries and computing structural decision matrices..."}) + "\n"
            await asyncio.sleep(0.4)

            # PASS REAL LIVE DATA TO THE RANKER ENGINE
            final_ranking = ranker_engine.rank_hospitals(patient_context, raw_scraped_data)

            # Map the structured Pydantic object elements cleanly into the delivery array
            hospitals_payload = []
            for hosp in final_ranking.recommended_hospitals:
                # Query Google Maps API for exact road metrics and spatial coordinates
                maps_info = research_engine.resolve_real_distance(patient_context.location, hosp.hospital_name)
                
                hospitals_payload.append({
                    "hospital_name": hosp.hospital_name,
                    "ranking_position": hosp.ranking_position,
                    "confidence_score": hosp.confidence_score,
                    "estimated_cost": hosp.estimated_cost,
                    "distance": maps_info.get("distance_text", hosp.distance),
                    "trust_score": hosp.trust_score,
                    "suitability": hosp.suitability,
                    "explanation": hosp.explanation,
                    "latitude": maps_info.get("lat"),
                    "longitude": maps_info.get("lng")
                })

            ai_final_summary = f"Based on your location in {patient_context.location} and health criteria regarding '{patient_context.symptoms}', I have processed local medical registries. Here are your optimized options:"
            conversation_history.append(("ai", ai_final_summary))

            yield json.dumps({
                "type": "final",
                "is_complete": True,
                "message": ai_final_summary,
                "data": {
                    "recommended_hospitals": hospitals_payload
                },
                "context": json.loads(patient_context.json())
            }) + "\n"

        except Exception as error:
            yield json.dumps({"type": "error", "message": f"Execution Error: {str(error)}"}) + "\n"

    return StreamingResponse(execution_stream(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)