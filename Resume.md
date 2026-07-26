# MedPath Codebase Analysis: Factual & Verifiable Data

This document contains factual, verifiable technical data extracted directly from the MedPath codebase. These details are structured for use in writing resume bullets.

---

## 1. Architecture & Tech Stack

### Services & Roles
* **MedPath Backend (Node.js/Express App):** State and coordination orchestrator. Acts as the main system API gateway and state manager. It implements Firebase JWT authentication, handles transaction workflows (Prisma/PostgreSQL), registers saved locations, and manages Redis caching for session and health states. It routes AI queries to the external Swasthya AI service.
* **Swasthya AI Core API (External Python REST API):** Heavy CPU-bound clinical calculations and AI triage. Statelessly handles clinical triage, symptom extraction, natural language processing, and geospatial rank-ordering algorithms. Integrates via HTTP endpoints (`/api/context/analyze`, `/api/discovery/search`, `/api/tasks/{taskId}/progress`).

### Database Architecture
* **PostgreSQL** database managed through **Prisma ORM**.
* **16 Prisma Models (Tables) Defined:**
  1. `SystemMetadata` (`SystemMetadata` table) – Key-value settings metadata.
  2. `Hospital` (`hospitals` table) – General hospital information, coordinates, ratings, and accreditation markers.
  3. `HospitalIntelligence` (`hospital_intelligence` table) – Core metrics (trust score, billing transparency, hidden charge risk, cleanliness, doctor quality, wait times).
  4. `HospitalReviewInsights` (`hospital_review_insights` table) – Sentiment score, positive/negative summaries, and AI summaries.
  5. `HospitalSpecialization` (`hospital_specializations` table) – Specialization mapping with associated confidence scores.
  6. `HospitalFacility` (`hospital_facilities` table) – Mapped amenities/facilities per hospital.
  7. `HospitalCostEstimate` (`hospital_cost_estimates` table) – Itemized costs (consultation, stay, diagnostics, surgery) by medical procedure.
  8. `HospitalSource` (`hospital_sources` table) – Mapped reference platforms and scraping metadata.
  9. `HospitalSearchCache` (`hospital_search_cache` table) – Search keyword indexing cache.
  10. `User` (`users` table) – User credentials, onboarding flags, login counters.
  11. `Conversation` (`conversations` table) – Chat session statuses, languages, and tracking UUIDs.
  12. `ConversationMessage` (`conversation_messages` table) – Chronological chat history logs (text, status, follow-up, final).
  13. `PatientContext` (`patient_contexts` table) – Extracted clinical parameters (symptoms, demographics, location, budgets).
  14. `SavedLocation` (`saved_locations` table) – Physical addresses saved by users for geolocation search.
  15. `RecommendationSnapshot` (`recommendation_snapshots` table) – Immutable historical record of generated hospital recommendations.
  16. `HospitalReview` (`hospital_reviews` table) – Patient cost feedback, accuracy metrics, and quality ratings.

### Caching Layer
* **Redis** cache integrated through a custom wrapper (`cache.service.js`).
* **Caching Usage:**
  * **Conversation Metadata Cache:** Caches conversation sessions (`conversation:${id}`) with a 30-minute (1800s) TTL to avoid SQL database reads on message streams.
  * **AI Health Cache:** Caches Swasthya API liveness checks (`health:swasthya`) with a 30-second TTL.
  * **Task Polling Cache:** Stores live background search status, progress, and stage details (`task:${taskId}`) with a 30-minute TTL to offload live polling from PostgreSQL.
  * **System Performance Metrics:** Collects and increments transaction failure counts, retry rates, and response durations in Redis (e.g., `metrics:ai_latency_sum`, `metrics:workflow_duration_sum`).

### Third-Party APIs Integrated
* **Firebase Admin SDK (Firebase Auth):** Server-side verification of client JWTs (`verifyIdToken`) for route authentication.
* **OpenStreetMap Nominatim API:** Handles reverse geocoding to translate GPS coordinates to human-readable addresses (`https://nominatim.openstreetmap.org/reverse`) in `location.service.js`.

---

## 2. API Surface

### REST Endpoints (26 Unique Endpoints Defined)
1. `GET /` – Root greeting
2. `GET /health` – Database & Redis connection checks
3. `GET /api/v1` – API v1 status and Swagger link
4. `GET /system/python-health` – Proxies external AI Core metrics and latency
5. `POST /auth/login` – Firebase ID token verification and user sync
6. `POST /auth/logout` – Stateless user logout
7. `GET /auth/me` – Current user session retrieval
8. `GET /users/profile` – Profile metadata retrieval
9. `PATCH /users/profile` – Profile updates (name, language, onboarding)
10. `DELETE /users/profile` – Profile deactivation (sets `isActive` to false)
11. `POST /conversations` – Creates a conversation session and initializes empty context
12. `GET /conversations` – Lists active user conversations
13. `GET /conversations/:id` – Fetches metadata, context, and message logs
14. `POST /conversations/:id/messages` – Submits chat message & yields streaming response (supports SSE `text/event-stream` format)
15. `GET /conversations/:id/discovery/progress` – Checks background search progress
16. `DELETE /conversations/:id` – Soft deletes conversation records
17. `GET /locations` – List user-saved addresses
18. `POST /locations` – Create new saved address
19. `POST /locations/current` – Reverse geocodes coordinates (Latitude/Longitude)
20. `PATCH /locations/:id` – Update saved location
21. `DELETE /locations/:id` – Delete saved location
22. `GET /reviews/history` – Retrieve user review history list
23. `GET /reviews/:conversationId` – Retrieve reviews by conversation ID
24. `POST /reviews` – Submit a draft or completed hospital review
25. `PATCH /reviews/:id` – Edit review ratings and cost details
26. `DELETE /reviews/:id` – Delete a review record

*(Note: `/locations` routes are registered on both `/locations` and `/location` prefixes, pointing to the same handlers).*

### Authentication & Authorization
* **Firebase Bearer JWT Authorization:** Custom middleware (`verifyFirebaseToken`) extracts Firebase tokens from the `Authorization: Bearer <token>` header, validates them via Firebase Admin SDK, verifies active profile state in PostgreSQL, and binds the profile to `req.user`.

---

## 3. Core Logic / Algorithms

* **Hospital recommendation/ranking logic:** **Not found** (delegated entirely to the external Swasthya AI Core API).
* **Cost estimation logic:** **Not found** (the application reads pre-calculated cost ranges from Swasthya discovery results and persists them to the database without performing any calculations).

---

## 4. LLM/AI Integration

* **LLM API Calls:** **Not found** (no direct calls to OpenAI, Gemini, or other model providers exist in this repository. Triage analysis is processed statelessly via the external Swasthya AI Core API `/api/context/analyze` endpoint).
* **Prompt Engineering:** **Not found** (fully encapsulated in the external service).
* **Retry Logic:** Implemented inside `swasthya.service.js` via `requestWithRetry`. Employs exponential backoff (defaults to **3 attempts**, starting at **1000ms delay**, doubling on subsequent retries) for connection timeouts, network faults, or internal server errors (HTTP 500+).
* **Output Parsing & Privacy Safeguards:** 
  * Implements `sanitizePatientContextForStorage` which deletes sensitive anatomical/clinical models (`clinical` object containing symptoms and medical history lists) before persisting context data to PostgreSQL/Redis.
  * Implements `redactSensitiveData` and `sanitizeAxiosError` which strips sensitive clinical fields (`symptoms`, `medical_history`, `current_medications`, `allergies`, `raw_message`, `message`) from diagnostic logs and Axios error objects to satisfy privacy guidelines.

---

## 5. Data Pipeline (Playwright/Scraping)

* **Scraping Pipeline:** **Not found** (no Playwright, Puppeteer, or other scraping modules exist in this repository. Although database tables track `lastScrapedAt`, the scraping process is not handled by the Node.js backend).

---

## 6. Infrastructure & Deployment

### Containerization
* **Dockerfile:** Multi-stage build target using Node 22 (`node:22-bookworm-slim`) configured to install dependencies (`npm ci`), run Prisma Client generation (`prisma generate`), and launch `src/server.js` on port `3000`.
* **docker-compose.yml:** Orchestrates three development services linked over a bridge network (`medpath_network`) with persistent volumes for data retention:
  1. `app`: The local Node.js Express server.
  2. `db`: A PostgreSQL 15 database instance (`postgres:15-alpine`).
  3. `redis`: A Redis 7 caching instance (`redis:7-alpine`).
* **Frontend:** The React application is not containerized (no Dockerfile exists in the `client` directory).

### Deployment
* Configured for deployment to **Render** via a GitHub Actions workflow in [deploy.yml](file:///.github/workflows/deploy.yml). Pushing to the `main` branch triggers a Render web service redeployment via a POST request to a Render webhook deploy hook (`secrets.RENDER_DEPLOY_HOOK_URL`).

---

## 7. Measurable Scale Indicators

* **REST Endpoints:** **26 unique endpoints** (plus aliases and prefix versions).
* **Database Tables:** **16 PostgreSQL tables** managed with Prisma.
* **Database Indexing:** Standard primary key (`@id`) and unique indexes (`@unique` or `@@unique`) for constraint enforcement. **No custom indexing strategies** (e.g., geospatial coordinates or GIN indexing) are defined in active database migrations or schema.
* **Test Coverage:** Custom integration script in [swasthya.integration.test.js](file:///server/tests/swasthya.integration.test.js) containing **5 test assertions** (3 unit tests for error sanitizers, context cleaners, and redaction logic, and 2 integration/liveness check API tests). No generic testing framework (like Jest or Mocha) is installed.
