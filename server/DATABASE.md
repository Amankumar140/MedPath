# MedPath Backend - Database Architecture & Guide

Welcome to the MedPath Database layer documentation. This document explains the database architecture, schema design, development commands, and operational procedures implemented for the MedPath platform.

---

## 1. Schema & Models

The MedPath database is powered by **PostgreSQL** and orchestrated through **Prisma ORM**. 

To maintain clean JavaScript/Node.js conventions while keeping strict snake_case conventions in the PostgreSQL database, all models use Prisma's `@map` and `@@map` attributes to translate database fields.

### Entity-Relationship Architecture

The following Prisma models are defined in [schema.prisma](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/prisma/schema.prisma):

```mermaid
erDiagram
    Hospital ||--|| HospitalIntelligence : "has metrics (1:1)"
    Hospital ||--|| HospitalReviewInsights : "has sentiments (1:1)"
    Hospital ||--o{ HospitalSpecialization : "offers (1:N)"
    Hospital ||--o{ HospitalFacility : "features (1:N)"
    Hospital ||--o{ HospitalCostEstimate : "quotes (1:N)"
    Hospital ||--o{ HospitalSource : "scraped from (1:N)"
    Hospital ||--o{ HospitalSearchCache : "indexed by (1:N)"

    Hospital {
        uuid id PK
        string hospital_name
        string ownership_type
        string address
        string locality
        string city
        string state
        string pincode
        float latitude
        float longitude
        string phone_number
        string website_url
        string google_maps_url
        float overall_rating
        int review_count
        boolean emergency_available
        boolean twenty_four_seven
        boolean icu_available
        boolean ambulance_available
        boolean insurance_cashless_available
        boolean accreditation_nabh
        boolean accreditation_nabl
        datetime created_at
        datetime updated_at
    }

    HospitalIntelligence {
        uuid id PK
        uuid hospital_id FK
        float trust_score
        float billing_transparency_score
        float hidden_charge_risk_score
        float recommendation_confidence
        float elderly_suitability_score
        float doctor_quality_score
        float emergency_capability_score
        float affordability_score
        float cleanliness_score
        float safety_score
        float patient_satisfaction_score
        int avg_wait_time_minutes
        float availability_confidence
        datetime updated_at
    }

    HospitalReviewInsights {
        uuid id PK
        uuid hospital_id FK
        float sentiment_score
        string positive_summary
        string negative_summary
        string ai_review_summary
        datetime last_review_update
    }

    HospitalSpecialization {
        uuid id PK
        uuid hospital_id FK
        string specialization_name
        float confidence_score
    }

    HospitalFacility {
        uuid id PK
        uuid hospital_id FK
        string facility_name
    }

    HospitalCostEstimate {
        uuid id PK
        uuid hospital_id FK
        string medical_category
        string condition_name
        string procedure_name
        float consultation_cost
        float diagnostics_cost
        float stay_cost
        float surgery_cost
        float contingency_cost
        string city
        datetime updated_at
    }

    HospitalSource {
        uuid id PK
        uuid hospital_id FK
        string source_name
        string source_url
        float source_rating
        int source_review_count
        datetime last_scraped_at
    }

    HospitalSearchCache {
        uuid id PK
        uuid hospital_id FK
        string[] search_keywords
        string[] matched_conditions
        float specialization_match_score
        datetime last_seen_online
        string[] source_platforms
    }
```

---

## 2. Connection Lifecycle & Management

Database connection settings and lifecycle are managed within [database.js](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/src/config/database.js).

### Reusable Prisma Client Singleton
During development, file changes trigger hot-reloading (via nodemon). To prevent accumulating multiple active `PrismaClient` connection pools, we initialize a singleton client attached to the `global` object:

```javascript
let prisma;
if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}
```

### Connection Pooling
Connection pooling is defined directly in the `DATABASE_URL` environment variable within [.env](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/.env). 
For example:
`DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require&connection_limit=10&pool_timeout=20"`

- **`connection_limit`**: Restricts the maximum number of concurrent database connections.
- **`pool_timeout`**: The amount of time Prisma will wait to acquire a connection from the pool before throwing an error.

### Exponential Backoff Retry Strategy
When the MedPath backend bootstraps, it tests the database connection with an exponential backoff retry mechanism. This prevents the server from crashing instantly if the database is starting up or experiencing brief network hiccups:

- **Max Retries**: 5 attempts.
- **Initial Delay**: 1,000ms (doubles with each retry attempt: 1s, 2s, 4s, 8s).

### Graceful Shutdown
To avoid hanging connections and memory leaks during deployment updates or container scaling:
1. Node process receives termination signals (`SIGINT` or `SIGTERM`).
2. Express HTTP server stops accepting new requests.
3. The server disconnects Prisma Client gracefully using `await prisma.$disconnect()`.
4. Redis cache connection is closed before exit.

---

## 3. Transaction Strategy & Common Utilities

Direct generic database layers (e.g. generic repositories) are avoided to leverage Prisma's type-safety. Instead, common database query utilities are exported directly from [database.js](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/src/config/database.js):

### Transaction Execution (`runTransaction`)
Wrap multiple operations to execute atomically inside an SQL transaction. Any failed statement automatically rolls back the entire batch:

```javascript
const { runTransaction } = require('./config/database');

const result = await runTransaction(async (tx) => {
  const hospital = await tx.hospital.create({ data: { ... } });
  await tx.hospitalIntelligence.create({ data: { hospitalId: hospital.id, ... } });
  return hospital;
});
```

### Paginated Queries (`paginate`)
Provides standard pagination formatting to modules, reducing boilerplate:

```javascript
const { paginate } = require('./config/database');

// Fetches paginated hospitals matching criteria
const result = await paginate('hospital', {
  where: { city: 'Bangalore' },
  orderBy: { hospitalName: 'asc' }
}, {
  page: 1,   // Current page
  limit: 10  // Items per page
});

// Returns structured response:
// {
//   items: [...],
//   pagination: { page, limit, totalCount, totalPages, hasNextPage, hasPrevPage }
// }
```

### Prisma Error Translator (`handlePrismaError`)
Inspects Prisma database error codes (such as `P2002` for duplicate values, `P2025` for not found, or `P2003` for invalid foreign keys) and maps them into JavaScript `Error` objects with informative user-friendly messages.

---

## 4. Development Workflow Commands

All database management operations are mapped to NPM scripts inside [package.json](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/package.json):

### Commands:

| Script Command | Command Executed | Purpose |
| :--- | :--- | :--- |
| `npm run db:generate` | `prisma generate` | Generates the Prisma client based on `schema.prisma`. Run this whenever the schema changes. |
| `npm run db:migrate:dev` | `prisma migrate dev` | Creates and runs SQL migrations in local/development environment. Prompts for migration name. |
| `npm run db:migrate:deploy` | `prisma migrate deploy` | Applies pending migrations to the target database in staging or production. Non-interactive. |
| `npm run db:studio` | `prisma studio` | Opens an interactive web browser dashboard for viewing and editing records. |

---

## 5. Health Checks Integration

The system `/health` route in [index.js](file:///c:/Users/amank/OneDrive/Desktop/MedPath/server/src/routes/index.js) checks:
1. **Connection**: Executes a raw query `SELECT 1` to ensure PostgreSQL is up.
2. **Latency**: Measures database response time in milliseconds.
3. **Migration Integrity**: Programmatically queries the `_prisma_migrations` table to verify:
   - Number of applied migrations.
   - Name of the last applied migration.
   - Success status of migrations (flags any unapplied or failed migrations to return `500 DEGRADED` state).
4. **Redis Cache Connection**: Pings Redis to measure cache response latency.
