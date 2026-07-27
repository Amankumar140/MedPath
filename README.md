# MedPath - Guided Healthcare & AI Clinical Navigation Platform

![MedPath Banner](https://raw.githubusercontent.com/Amankumar140/MedPath/main/client/src/assets/screen.png)

MedPath is an AI-powered, location-aware guided healthcare platform designed to simplify clinical triage, streamline symptom analysis, and match patients with local clinical departments and healthcare providers.

---

## 🌟 Key Features

- 🩺 **AI Clinical Triage Chat**: Real-time streaming symptom assessment powered by dedicated LLM microservices (LangChain & FastAPI).
- ⚡ **Optimistic & Flicker-Free UI**: Smooth Server-Sent Events (SSE) streaming with permanent message mounting and interactive status indicators.
- 📍 **Geospatial Hospital Discovery**: Real-time matching of identified symptoms against local clinical departments, distance, and estimated care costs.
- 🎙️ **Voice Dictation**: Hands-free symptom input using integrated Web Speech API dictation.
- 🛡️ **HIPAA-Inspired Security & Authentication**: Firebase Authentication paired with JWT validation and role-based access.
- ⭐️ **Patient Reviews & Ratings System**: Verified patient experience reviews with detailed ratings across cleanliness, wait times, and staff responsiveness.
- 🎨 **Modern Glassmorphic Design System**: Light and dark mode support built with Tailwind CSS, custom design tokens, and fluid Framer Motion animations.

---

## 🏗️ Architecture & Technology Stack

MedPath is built using a modern 3-tier microservices architecture:

```mermaid
graph TD
    A[Client - React + Vite UI] -->|HTTP / REST| B[Server - Node.js Express API]
    A -->|SSE Stream| B
    B -->|Database Query| C[(Database - PostgreSQL / Prisma)]
    B -->|FastAPI LLM Call| D[LLM Microservice - Python FastAPI]
    D -->|LangChain Orchestration| E[LLM Provider - Mistral AI / Gemini]
    B -->|Session Caching| F[(Redis Cache)]
```

### 1. Frontend (`/client`)
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4, Custom Glassmorphic Design System
- **State & Routing**: React Router v7, React Context API
- **Icons & Motion**: Material Symbols, Framer Motion
- **Validation**: Zod, React Hook Form

### 2. Backend API (`/server`)
- **Runtime**: Node.js (>=18.0) + Express
- **Database & ORM**: Prisma ORM with PostgreSQL / SQLite
- **Auth**: Firebase Admin SDK
- **Logging & Security**: Winston, Helmet, CORS, Express Rate Limit
- **API Docs**: Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)

### 3. LLM Microservice (`/llm`)
- **Framework**: Python 3.10+ & FastAPI + Uvicorn
- **Orchestration**: LangChain, Pydantic v2
- **Models**: Mistral AI / Google Gemini
- **Testing**: Pytest, Pytest-Asyncio

---

## 📁 Repository Structure

```text
MedPath/
├── client/                     # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI Primitives & Chat Components
│   │   │   ├── chat/           # Streaming Bubble, Thinking Cards, Discovery Card
│   │   │   ├── location/       # Location Permission Modal & Manual Form
│   │   │   └── ui/             # Card, Button, Input, Badge, ProgressBar
│   │   ├── context/            # Auth, Conversation, Location & Theme Contexts
│   │   ├── layouts/            # Main Responsive App Layout & Sidebar
│   │   ├── pages/              # ChatPage, Dashboard, HospitalDetails, Reviews
│   │   └── services/           # Axios API Client & Conversation SSE Stream
│   ├── index.css               # Design Tokens & Custom CSS Utilities
│   └── vite.config.js
│
├── server/                     # Node.js + Express Backend API
│   ├── prisma/                 # Prisma Database Schema & Migrations
│   ├── src/
│   │   ├── config/             # Environment Configurations & Firebase Admin
│   │   ├── modules/            # Auth, AI, Conversations, Reviews Modules
│   │   ├── routes/             # Express API Route Handlers
│   │   └── services/           # Discovery Polling & LLM Integration Service
│   └── server.js
│
├── llm/                        # Python FastAPI LLM Microservice
│   ├── app/
│   │   ├── agents.py           # Clinical Triage & Prompt Orchestrator
│   │   ├── config.py           # Pydantic BaseSettings
│   │   ├── memory.py           # Conversation State & Context Extraction
│   │   ├── prompts/            # Triage & Symptom Parsing Prompts
│   │   └── schemas.py          # Input/Output Request Pydantic Models
│   └── main.py                 # FastAPI App Entrypoint
│
├── DESIGN_SYSTEM.md            # Frontend UI Design System Specifications
├── LOCATION.md                 # Location Engine & Geolocation Documentation
└── REVIEW_SYSTEM.md            # Patient Reviews Architecture Documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Python**: `3.10` or higher
- **Git**

---

### 🛠️ Installation & Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Amankumar140/MedPath.git
cd MedPath
```

---

#### 2. Setup LLM Microservice (Python FastAPI)
```bash
cd llm
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `llm/` directory:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
PORT=8000
LOG_LEVEL=INFO
```

Start the FastAPI service:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

---

#### 3. Setup Server (Node.js API)
In a new terminal window:
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=3000
DATABASE_URL="file:./dev.db" # or PostgreSQL connection string
PYTHON_MICROSERVICE_URL="http://localhost:8000"
JWT_SECRET="your_jwt_secret_key"
NODE_ENV="development"
```

Initialize Database & Start Dev Server:
```bash
npm run db:generate
npm run db:migrate:dev
npm run dev
```

---

#### 4. Setup Client (React Frontend)
In a third terminal window:
```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:
```env
VITE_API_URL="http://localhost:3000/api/v1"
```

Start the Frontend Dev Server:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Testing & Verification

### Running Frontend Linter
```bash
cd client
npm run lint
```

### Running LLM Microservice Tests
```bash
cd llm
pytest
```

---

## 📋 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/session` | Authenticate user & sync profile |
| `GET` | `/api/v1/conversations` | List user consultation history |
| `POST` | `/api/v1/conversations` | Start a new consultation session |
| `POST` | `/api/v1/conversations/:id/messages` | Stream user message via SSE |
| `GET` | `/api/v1/conversations/:id/discovery/progress` | Poll background department search progress |
| `GET` | `/api/v1/hospitals` | Search & filter local hospitals by location/symptoms |
| `POST` | `/api/v1/reviews` | Submit patient experience review |

---

## ⚠️ Medical Disclaimer

MedPath is an AI-assisted guidance tool designed for informational and navigation purposes only. It is **not** a substitute for professional medical advice, diagnosis, or emergency care. In case of a medical emergency, please immediately contact your local emergency services or visit the nearest emergency room.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
