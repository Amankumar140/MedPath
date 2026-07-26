# Conversations & AI Orchestration Module

This module serves as the central orchestration controller and security gateway of the MedPath system, linking client applications to the downstream Swasthya AI Core API platform.

---

## 🏛️ System Responsibilities

To maintain clean decoupling and prevent architectural bleed:

| Layer / Service | Primary Responsibilities |
| :--- | :--- |
| **Node.js Backend** (Orchestrator) | - Authentication (via Firebase Token Validation)<br>- Validation of schemas and parameters (via Zod)<br>- Security checks & resource ownership validation<br>- Conversational State Management & DB Persistence<br>- Redis Caching (Metadata, Swasthya Uptime)<br>- Streaming Relay (Relaying Swasthya output to clients via SSE) |
| **Swasthya AI Core** (AI Brain) | - Stateless healthcare intelligence engine<br>- Real-time patient context analysis<br>- Asynchronous clinical department discovery, web scraping, and ranking |

---

## 🔁 Request Lifecycle & SSE Streaming Flow

The integration implements real-time Server-Sent Events (SSE) streaming for a responsive client experience:

```mermaid
sequenceDiagram
    participant Client as Web Client
    participant Node as Node.js Gateway
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant Swasthya as Swasthya AI Core API

    Client->>Node: POST /api/v1/conversations/:id/messages (with Header Accept: text/event-stream)
    Node->>Node: Verify Firebase ID Token
    Node->>DB: Save User message (USER / TEXT)
    Node->>Swasthya: POST /api/context/analyze { message, context_id } (Axios)
    
    Swasthya-->>Node: Returns analysis results
    Node->>Client: Establish SSE headers & send events (data: {"type": "status", "message": "..."})

    loop Polling discovery progress
        Swasthya-->>Node: Returns task progress polling results
        Node->>Client: data: {"type": "status", ...}
    end

    Swasthya-->>Node: Returns completed discovery recommendations
    
    Note over Node: Stream ends (Swasthya finishes)
    Node->>DB: Save AI response message (AI / FINAL or AI / FOLLOW_UP)
    Node->>DB: Update PatientContext fields (symptoms, age, location, careIntent, etc.)
    Node->>DB: Insert RecommendationSnapshot records (hospital name, rank, trust, cost, distance, coordinates, explanation)
    Node->>Node: Record AI latency & workflow duration metrics
    Node->>Cache: Set updated conversation metadata cache
    Node->>Client: event: end (data: Stream complete)
```

---

## 🗄️ Database snapshot strategy

### PatientContext Table
The `PatientContext` table is updated on every final chunk received from the Swasthya AI Core service. It is updated *strictly* using the parsed `context` payload emitted by Swasthya. Node.js never attempts to parse, infer, or alter any clinical variables.

### RecommendationSnapshots Table
When the conversation's patient context shifts to complete (`is_context_complete: true`), the Swasthya service executes its clinical department discovery search and ranking, returning an ordered list of recommended hospitals.
- Node.js iterates and stores each candidate inside the `recommendation_snapshots` table.
- Mapped fields: hospital name, ranking position, confidence score, trust score, estimated cost, road distance, coordinates, explanation, source, and creation timestamp.
- **Historical Nature:** This table is strictly append-only. Old snapshots are never overwritten, allowing audit logs of previous recommendation queries.

---

## 📡 Retry Strategy & Failure Recovery

1. **Gateway Retries:**
   Initial HTTP connection handshakes with the Swasthya service are wrapped in an exponential backoff wrapper (`requestWithRetry`).
   - If Swasthya is offline, overloaded, or returns a `5xx` error, Node.js retries connection up to **3 times**.
   - Backoff starts at **1 second** and doubles on each failure (1s ➔ 2s ➔ 4s).
2. **Failure Metrics:**
   - If connection is lost or retries are exhausted, Node.js increments `metrics:failure_count` in Redis.
   - Standardized API error objects are logged to Winston and returned to the client.
3. **Mid-stream Failures:**
   - If the stream drops *after* headers are written, the Node.js SSE channel emits an `event: error` JSON block before concluding, notifying the client UI to render an alert.

---

## 📊 Orchestration Performance Metrics

Node.js logs performance metrics in Redis under `metrics:*` to analyze service-level-agreements (SLAs) without burdening database tables:

- **Average AI Latency:** Tracked in milliseconds via `metrics:ai_latency_sum` and `metrics:ai_latency_count`.
- **Average Workflow Duration:** Calculated from user submit to stream conclusion.
- **Uptime Tracking:** Tracks the first healthy timestamp when Node.js successfully pings the Swasthya service, recording the uptime duration.
- **Failures and Retries:** Counters increments on connection retry events and workflow crashes.

Metrics and Swasthya health are queryable at the proxy endpoint:
`GET /api/v1/system/python-health` (Cached for 30s in Redis).
