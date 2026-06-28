from langchain_core.prompts import ChatPromptTemplate
from config import get_llm
from schemas import PatientContext
import os

# Import Mistral native support
from langchain_mistralai import ChatMistralAI

class TriageAgent:
    def __init__(self):
        # 1. Initialize Primary Engine (Gemini)
        try:
            self.primary_llm = get_llm()
            self.primary_structured = self.primary_llm.with_structured_output(PatientContext)
        except Exception as e:
            print(f"⚠️ Primary LLM Init Warning: {e}")
            self.primary_structured = None

        # 2. Initialize Fallback Engine (Mistral)
        try:
            self.fallback_llm = ChatMistralAI(
                model="mistral-large-latest", 
                temperature=0,
                mistral_api_key=os.getenv("MISTRAL_API_KEY")
            )
            self.fallback_structured = self.fallback_llm.with_structured_output(PatientContext)
        except Exception as e:
            print(f"⚠️ Fallback LLM Init Warning: {e}")
            self.fallback_structured = None
        
        # Shared Triage Prompt System
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are an advanced medical triage coordinator routing engine.
Your goal is to parse user messages to capture essential patient parameters.

CRITICAL CRITERIA FOR COMPLETENESS (is_context_complete = True):
1. Symptoms details are extracted.
2. Patient Age is specified.
3. Patient Location is clear (Coordinates, city, or neighborhood).
4. Care Intent is clear (Does the user want a regular OPD visit or are they planning a surgery/operation?).

LANGUAGE RETENTION MANDATE (STRICTLY ENFORCED):
You must analyze the full conversation history and the current user input to determine and lock the conversation language:
- Look at the very first message in the conversation. If the user started with an English greeting (e.g., "Hi", "Hello", "Hey", "Hii") or standard English, the conversation language is strictly LOCKED to English ('en'). You must set `detected_language` to 'en' and respond ONLY in English. Do NOT use Hinglish or Hindi.
- If the first user input or main content is in Pure Hindi (using Devanagari script, e.g., "नमस्ते", "मेरे पिता को दर्द है"), you must set `detected_language` to 'hi' and reply in pure Hindi using Devanagari script.
- If the first user input or main content is in Hinglish (Hindi words written using the Latin script, e.g., "Mere papa ke chest me pain hai"), you must set `detected_language` to 'hinglish' and reply in Hinglish.
- Once a language is established in the conversation history, you MUST stick to it for `detected_language` and for the `follow_up_question`. NEVER switch languages mid-conversation.
- Single-word inputs or short replies like "Yes", "No", "Emergency", "Okay", or brief names/locations must NEVER trigger a language switch. Keep the language completely stable.

If details are missing, set is_context_complete to False and craft an empathetic, natural conversational follow-up question (follow_up_question) in the locked `detected_language` matching the script guidelines above. Keep questions concise and medical-triage focused.
             
CONVERSATIONAL HANDLING FOR GREETINGS:
If the user message is just a basic greeting (like 'Hi', 'Hello', 'Hii', 'Hey'), set all optional parameters (symptoms, age, location, care_intent) to null. Set is_context_complete to False, lock the language to English ('en'), and write a warm, welcoming follow-up question in English asking how you can help them today.
"""),
            ("placeholder", "{conversation_history}"),
            ("user", "Current message: {user_input}")
        ])
        

    def analyze_input(self, user_input: str, conversation_history: list) -> PatientContext:
        """Executes the triage parsing with automated failover routing."""
        
        # ---- TRY PRIMARY ENGINE (GEMINI) ----
        if self.primary_structured:
            try:
                chain = self.prompt_template | self.primary_structured
                return chain.invoke({
                    "user_input": user_input,
                    "conversation_history": conversation_history
                })
            except Exception as primary_error:
                print(f"\n[FAILOVER] Primary Engine crashed: {primary_error}")
                print("[FAILOVER] Activating Mistral Fallback Engine immediately...\n")

        # ---- TRY FALLBACK ENGINE (MISTRAL) ----
        if self.fallback_structured:
            try:
                fallback_chain = self.prompt_template | self.fallback_structured
                return fallback_chain.invoke({
                    "user_input": user_input,
                    "conversation_history": conversation_history
                })
            except Exception as fallback_error:
                raise RuntimeError(
                    f"Critical System Fault: Both Gemini and Mistral engines failed to process input. "
                    f"Fallback error details: {fallback_error}"
                )
        
        raise RuntimeError("Configuration Error: Neither LLM provider engine was initialized successfully.")