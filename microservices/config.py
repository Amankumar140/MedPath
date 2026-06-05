import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mistralai import ChatMistralAI

load_dotenv()

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY environment variable.")
if not GOOGLE_MAPS_KEY:
    raise ValueError("Missing GOOGLE_MAPS_API_KEY environment variable.")

def get_llm():
    primary_llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-latest",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.1
    )
    fallback_llm = ChatMistralAI(
        model="mistral-large-latest",
        mistral_api_key=MISTRAL_API_KEY,
        temperature=0.1
    )
    return primary_llm.with_fallbacks([fallback_llm])