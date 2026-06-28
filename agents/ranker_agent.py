import os
from langchain_core.prompts import ChatPromptTemplate
from config import get_llm
from schemas import FinalResearchResult, PatientContext, ScrapedHospitalData
from langchain_mistralai import ChatMistralAI

class RankerAgent:
    def __init__(self):
        # 1. Initialize Primary Structural Parser (Gemini)
        try:
            self.primary_llm = get_llm()
            self.primary_structured = self.primary_llm.with_structured_output(FinalResearchResult)
        except Exception as e:
            print(f"⚠️ Ranker Primary LLM Init Warning: {e}")
            self.primary_structured = None

        # 2. Initialize Fallback Structural Parser (Mistral)
        try:
            self.fallback_llm = ChatMistralAI(
                model="mistral-large-latest", 
                temperature=0,
                mistral_api_key=os.getenv("MISTRAL_API_KEY")
            )
            self.fallback_structured = self.fallback_llm.with_structured_output(FinalResearchResult)
        except Exception as e:
            print(f"⚠️ Ranker Fallback LLM Init Warning: {e}")
            self.fallback_structured = None

        # Custom Analytical Ranking Template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are an advanced medical facility ranking engine.
Your task is to evaluate live web-scraped search text logs and extract the top 3 to 4 best-suited real-world hospitals or specialized centers matching the patient's criteria.

PATIENT FILE CONTEXT:
- Symptoms: {symptoms}
- Age: {age}
- Location: {location}
- Care Intent: {care_intent}
- Budget Parameter: {budget}

RAW SCRAPED WEB DATA LOGS:
{scraped_content}

CRITICAL RULES FOR RANKING EXECUTION:
1. STRICT TRUTH AND ANTI-HALLUCINATION RULE: Identify and extract 3 to 4 distinct real hospitals or clinics ONLY from the provided RAW SCRAPED WEB DATA LOGS. You MUST NEVER invent or hallucinate hospitals, and you must NEVER use your internal pre-training knowledge base to suggest facilities that aren't mentioned in the web logs. If the logs contain fewer hospitals, only return those found. Do not add any extra ones.
2. Order the results sequentially from Rank #1 down to Rank #3 or #4 based on proximity to the user's location ({location}) and their explicit departmental relevance matching the exact symptoms ({symptoms}) and care intent ({care_intent}). Do NOT use eye-care specific terminology unless the patient's symptoms are explicitly eye-related.
3. NEVER suggest distant facilities across state lines or outside the relevant locality zones unless no closer options appear in the scraped text logs.
4. Calculate realistic trust scores (1.0 to 5.0) and match reliability confidence intervals (0.0 to 1.0).
5. Provide clear text definitions for the 'suitability' and 'explanation' fields detailing why each choice matches the patient's specific symptoms profile, departmental need, and location constraints.
"""),
            ("user", "Analyze the clinical parameters against the web logs and output a verified structured FinalResearchResult payload.")
        ])

    def rank_hospitals(self, context: PatientContext, scraped_data: list[ScrapedHospitalData]) -> FinalResearchResult:
        """Processes raw text data fragments into structured ranking profiles."""
        # Convert scraped data list into a single structured block for the LLM prompt
        formatted_logs = ""
        for i, doc in enumerate(scraped_data):
            formatted_logs += f"\n--- Source Card {i+1} ({doc.source}): {doc.name} ---\n{doc.raw_text}\n"

        input_args = {
            "symptoms": context.symptoms,
            "age": context.age,
            "location": context.location,
            "care_intent": context.care_intent,
            "budget": context.budget,
            "scraped_content": formatted_logs if formatted_logs.strip() else "No web results found. Use your knowledge base to find verified regional facilities."
        }

        # Execution Path A: Gemini Processing
        if self.primary_structured:
            try:
                chain = self.prompt_template | self.primary_structured
                return chain.invoke(input_args)
            except Exception as primary_error:
                print(f"[RANKER FAILOVER] Primary ranking step failed: {primary_error}")

        # Execution Path B: Mistral Failover Core
        if self.fallback_structured:
            try:
                chain = self.prompt_template | self.fallback_structured
                return chain.invoke(input_args)
            except Exception as fallback_error:
                raise RuntimeError(f"Critical System Fault: Structural parsing failed globally. Trace: {fallback_error}")

        raise RuntimeError("Configuration Error: RankerAgent could not establish an active LLM pipeline.")