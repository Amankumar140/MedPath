# 🏥 MedPath

AI-Powered Hospital Intelligence & Recommendation Platform

---

## Overview

MedPath helps users discover the most suitable hospitals based on:

- Symptoms
- Medical condition
- Emergency status
- Budget
- Location
- Insurance preferences
- Travel distance and time
- Hospital facilities
- Doctor quality signals
- Patient reviews
- Accreditation and trust signals

The platform combines AI reasoning, search intelligence, hospital research, and cached knowledge to generate personalized hospital recommendations.

---

## Current Progress

| Module | Status |
|----------|----------|
| `backend/core` | ✅ Completed |
| Database Design | ✅ Completed |
| Backend Architecture | ✅ Planned |
| API Layer | ⏳ Pending |
| AI Layer | ⏳ Pending |
| Recommendation Engine | ⏳ Pending |
| Scraping Layer | ⏳ Pending |
| Workers | ⏳ Pending |

---

## Backend Architecture

```text
backend/
│
├── app/
│   ├── main.py
│   ├── lifespan.py
│   │
│   ├── core/                     ✅ Completed
│   │   ├── config.py
│   │   ├── constants.py
│   │   ├── enums.py
│   │   ├── exceptions.py
│   │   ├── logger.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   └── middleware.py
│   │
│   ├── api/
│   ├── schemas/
│   ├── db/
│   ├── models/
│   ├── repositories/
│   ├── services/
│   ├── ai/
│   ├── integrations/
│   ├── scraping/
│   ├── recommendation_engine/
│   ├── workers/
│   ├── auth/
│   ├── chat/
│   ├── monitoring/
│   └── utils/
│
├── tests/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## Tech Stack

### Backend

- FastAPI
- Python 3.12
- PostgreSQL (Supabase)
- Firebase Authentication
- Firebase Firestore
- Redis
- Celery

### AI

- Gemini
- Mistral (Fallback)

### Search & Research

- Tavily Search
- Google Maps APIs
- Playwright
- Selenium
- BeautifulSoup

### Infrastructure

- Docker
- Docker Compose

---

## Key Features

### AI Medical Intent Extraction

Converts:

```text
"I have blurry vision and cataract symptoms"
```

Into:

```json
{
  "specialization": "Ophthalmology",
  "condition": "Cataract",
  "urgency": "Medium"
}
```

### Smart Hospital Recommendations

Factors:

- Specialization Match
- Distance
- Travel Time
- Cost
- Trust Score
- Emergency Capability
- Doctor Quality
- Cleanliness
- Safety
- Patient Satisfaction

### Knowledge Cache

Research findings are stored in Supabase and reused in future searches.

### Hospital Intelligence

Generates:

- Trust Score
- Billing Transparency
- Hidden Charge Risk
- Safety Score
- Affordability Score
- Recommendation Confidence

---

## Development Roadmap

1. Core Layer ✅
2. Database Layer
3. Integrations
4. AI Layer
5. Services Layer
6. Recommendation Engine
7. API Layer
8. Workers
9. Scraping System
10. Deployment

---

## Contributors

- Aman Kumar
- Prince Singh

---

## License

MIT License
