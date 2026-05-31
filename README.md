# Latest Commit : 31-05-2026
`backend/core` -- creation done 

# MedPath Backend guige

backend/
│
├── app/
│   │
│   ├── main.py                                   # -- FastAPI Entry Point
│   ├── lifespan.py                               # -- Startup & Shutdown Events
│   │
│   ├── `core/` `Done`
│   │   `├── config.py`                             # -- Environment Settings
│   │   `├── constants.py`                          # -- Global Constants
│   │   `├── enums.py`                              # -- Application Enums
│   │   `├── exceptions.py`                         # -- Custom Exceptions
│   │   `├── logger.py`                             # -- Structured Logging
│   │   `├── security.py`                           # -- Security Utilities
│   │   `├── dependencies.py`                       # -- Dependency Injection
│   │   `└── middleware.py`                         # -- Global Middleware
│   │
│   ├── api/
│   │   │
│   │   ├── router.py                             # -- Main Router
│   │   │
│   │   ├── health.py                             # -- Health Endpoints
│   │   ├── recommendation.py                     # -- Hospital Recommendation API
│   │   ├── hospital.py                           # -- Hospital APIs
│   │   ├── compare.py                            # -- Hospital Compare APIs
│   │   ├── research.py                           # -- Research APIs
│   │   ├── bookmarks.py                          # -- Save Hospital APIs
│   │   ├── history.py                            # -- User Search History APIs
│   │   ├── chat.py                               # -- AI Chat APIs
│   │   ├── analytics.py                          # -- Analytics APIs
│   │   └── admin.py                              # -- Admin APIs
│   │
│   ├── schemas/
│   │   │
│   │   ├── recommendation.py                     # -- Recommendation Request/Response
│   │   ├── hospital.py                           # -- Hospital Schemas
│   │   ├── compare.py                            # -- Comparison Schemas
│   │   ├── research.py                           # -- Research Schemas
│   │   ├── chat.py                               # -- Chat Schemas
│   │   ├── user.py                               # -- User Schemas
│   │   ├── analytics.py                          # -- Analytics Schemas
│   │   └── common.py                             # -- Common Schemas
│   │
│   ├── db/
│   │   │
│   │   ├── session.py                            # -- SQLAlchemy Session
│   │   ├── base.py                               # -- Base Model
│   │   ├── database.py                           # -- DB Connection
│   │   └── seed.py                               # -- Seed Scripts
│   │
│   ├── models/
│   │   │
│   │   ├── hospital.py                           # -- Hospitals Table
│   │   ├── specialization.py                     # -- Specializations Table
│   │   ├── facility.py                           # -- Facilities Table
│   │   ├── hospital_source.py                    # -- Research Sources Table
│   │   ├── cost_estimate.py                      # -- Cost Estimates Table
│   │   ├── review_insight.py                     # -- Review Insights Table
│   │   ├── hospital_intelligence.py              # -- Intelligence Scores
│   │   ├── search_cache.py                       # -- Cache Table
│   │   ├── recommendation_log.py                 # -- Recommendation Logs
│   │   ├── user_history.py                       # -- Search History
│   │   ├── saved_hospital.py                     # -- User Saved Hospitals
│   │   ├── hospital_doctor.py                    # -- Doctor Information
│   │   ├── hospital_language.py                  # -- Languages
│   │   ├── accreditation.py                      # -- NABH/NABL
│   │   ├── hospital_availability.py              # -- Availability Data
│   │   ├── hospital_review.py                    # -- Raw Reviews
│   │   ├── hospital_ranking.py                   # -- Ranking Storage
│   │   ├── research_job.py                       # -- Research Queue
│   │   ├── analytics.py                          # -- Analytics
│   │   └── api_usage.py                          # -- API Usage Logs
│   │
│   ├── repositories/
│   │   │
│   │   ├── hospital_repository.py                # -- Hospital Queries
│   │   ├── recommendation_repository.py          # -- Recommendation Queries
│   │   ├── cache_repository.py                   # -- Cache Queries
│   │   ├── history_repository.py                 # -- User History Queries
│   │   ├── bookmark_repository.py                # -- Bookmark Queries
│   │   ├── analytics_repository.py               # -- Analytics Queries
│   │   └── research_repository.py                # -- Research Queries
│   │
│   ├── services/
│   │   │
│   │   ├── recommendation_service.py             # -- Main Recommendation Logic
│   │   ├── ranking_service.py                    # -- Hospital Ranking Engine
│   │   ├── research_service.py                   # -- Research Orchestrator
│   │   ├── cache_service.py                      # -- Cache Manager
│   │   ├── hospital_service.py                   # -- Hospital Logic
│   │   ├── compare_service.py                    # -- Comparison Logic
│   │   ├── bookmark_service.py                   # -- Save Logic
│   │   ├── history_service.py                    # -- History Logic
│   │   ├── analytics_service.py                  # -- Analytics Logic
│   │   ├── cost_estimation_service.py            # -- Cost Engine
│   │   ├── trust_score_service.py                # -- Trust Score Engine
│   │   ├── suitability_service.py               # -- Elderly/Diabetic Suitability
│   │   ├── availability_service.py              # -- Availability Logic
│   │   └── review_summary_service.py             # -- Review Analysis
│   │
│   ├── ai/
│   │   │
│   │   ├── llm_manager.py                        # -- LLM Router
│   │   ├── gemini_provider.py                    # -- Gemini Integration
│   │   ├── mistral_provider.py                   # -- Mistral Integration
│   │   ├── prompt_templates.py                   # -- All AI Prompts
│   │   ├── symptom_parser.py                     # -- Symptom Understanding
│   │   ├── intent_extractor.py                   # -- Medical Intent Extraction
│   │   ├── hospital_reasoner.py                  # -- Recommendation Reasoning
│   │   ├── review_analyzer.py                    # -- Review Analysis
│   │   ├── cost_reasoner.py                      # -- Cost Estimation AI
│   │   └── confidence_engine.py                  # -- Confidence Scoring
│   │
│   ├── integrations/
│   │   │
│   │   ├── supabase_client.py                    # -- Supabase Connection
│   │   ├── firebase_client.py                    # -- Firebase Connection
│   │   ├── tavily_client.py                      # -- Tavily Search
│   │   ├── google_maps_client.py                 # -- Maps APIs
│   │   ├── redis_client.py                       # -- Redis
│   │   └── celery_client.py                      # -- Celery
│   │
│   ├── scraping/
│   │   │
│   │   ├── scraper_manager.py                    # -- Scraper Orchestrator
│   │   ├── base_scraper.py                       # -- Base Scraper
│   │   ├── hospital_site_scraper.py              # -- Hospital Websites
│   │   ├── google_review_scraper.py              # -- Reviews
│   │   ├── practo_scraper.py                     # -- Practo
│   │   ├── accreditation_scraper.py             # -- NABH/NABL
│   │   ├── doctor_scraper.py                     # -- Doctor Data
│   │   ├── facility_scraper.py                   # -- Facility Data
│   │   └── cost_scraper.py                       # -- Cost Data
│   │
│   ├── recommendation_engine/
│   │   │
│   │   ├── ranking_formula.py                    # -- Final Ranking Formula
│   │   ├── specialization_matcher.py            # -- Specialization Matching
│   │   ├── affordability_score.py               # -- Affordability
│   │   ├── distance_score.py                    # -- Distance Scoring
│   │   ├── trust_score.py                       # -- Trust Scoring
│   │   ├── safety_score.py                      # -- Safety Scoring
│   │   ├── emergency_score.py                   # -- Emergency Scoring
│   │   ├── suitability_score.py                 # -- Suitability Scoring
│   │   └── final_ranker.py                      # -- Final Ranking Engine
│   │
│   ├── workers/
│   │   │
│   │   ├── celery_worker.py                      # -- Celery Worker
│   │   ├── cache_refresh_worker.py               # -- Cache Refresh Jobs
│   │   ├── review_refresh_worker.py              # -- Review Refresh Jobs
│   │   ├── hospital_refresh_worker.py            # -- Hospital Refresh Jobs
│   │   ├── ranking_worker.py                     # -- Recompute Rankings
│   │   └── research_worker.py                    # -- Background Research
│   │
│   ├── auth/
│   │   │
│   │   ├── firebase_auth.py                      # -- Firebase Auth
│   │   ├── auth_service.py                       # -- Authentication Logic
│   │   └── user_context.py                       # -- Current User Extraction
│   │
│   ├── chat/
│   │   │
│   │   ├── chat_service.py                       # -- Chat Logic
│   │   ├── history_manager.py                    # -- Firestore History
│   │   └── conversation_context.py              # -- Conversation Memory
│   │
│   ├── monitoring/
│   │   │
│   │   ├── metrics.py                            # -- Prometheus Metrics
│   │   ├── health_checks.py                      # -- Health Monitoring
│   │   └── tracing.py                            # -- OpenTelemetry
│   │
│   └── utils/
│       │
│       ├── helpers.py                            # -- Generic Helpers
│       ├── date_utils.py                         # -- Date Helpers
│       ├── text_utils.py                         # -- Text Processing
│       ├── location_utils.py                     # -- Geo Utilities
│       ├── hashing.py                            # -- Hashing Utilities
│       └── validators.py                         # -- Validation Utilities
│
├── alembic/
│   ├── env.py                                    # -- Alembic Environment
│   ├── script.py.mako                            # -- Migration Template
│   └── versions/                                # -- DB Migrations
│
├── tests/
│   ├── test_recommendation.py                   # -- Recommendation Tests
│   ├── test_ranking.py                          # -- Ranking Tests
│   ├── test_hospital.py                         # -- Hospital Tests
│   ├── test_scrapers.py                         # -- Scraper Tests
│   ├── test_ai.py                               # -- AI Layer Tests
│   ├── test_auth.py                             # -- Auth Tests
│   └── test_api.py                              # -- API Tests
│
├── scripts/
│   ├── init_db.py                               # -- Initialize DB
│   ├── seed_data.py                             # -- Seed Data
│   └── create_admin.py                          # -- Admin Creation
│
├── .env                                         # -- Secrets
├── .env.example                                 # -- Template
├── .gitignore                                   # -- Git Ignore
├── alembic.ini                                  # -- Alembic Config
├── Dockerfile                                   # -- API Container
├── docker-compose.yml                           # -- Services
├── requirements.txt                             # -- Dependencies
├── README.md                                    # -- Documentation
└── pyproject.toml                               # -- Python Project Config
