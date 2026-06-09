-- CreateTable
CREATE TABLE "SystemMetadata" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" UUID NOT NULL,
    "hospital_name" TEXT NOT NULL,
    "ownership_type" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone_number" TEXT,
    "website_url" TEXT,
    "google_maps_url" TEXT,
    "overall_rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "emergency_available" BOOLEAN,
    "twenty_four_seven" BOOLEAN,
    "icu_available" BOOLEAN,
    "ambulance_available" BOOLEAN,
    "insurance_cashless_available" BOOLEAN,
    "accreditation_nabh" BOOLEAN,
    "accreditation_nabl" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_intelligence" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "trust_score" DOUBLE PRECISION,
    "billing_transparency_score" DOUBLE PRECISION,
    "hidden_charge_risk_score" DOUBLE PRECISION,
    "recommendation_confidence" DOUBLE PRECISION,
    "elderly_suitability_score" DOUBLE PRECISION,
    "doctor_quality_score" DOUBLE PRECISION,
    "emergency_capability_score" DOUBLE PRECISION,
    "affordability_score" DOUBLE PRECISION,
    "cleanliness_score" DOUBLE PRECISION,
    "safety_score" DOUBLE PRECISION,
    "patient_satisfaction_score" DOUBLE PRECISION,
    "avg_wait_time_minutes" INTEGER,
    "availability_confidence" DOUBLE PRECISION,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_review_insights" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "sentiment_score" DOUBLE PRECISION,
    "positive_summary" TEXT,
    "negative_summary" TEXT,
    "ai_review_summary" TEXT,
    "last_review_update" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_review_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_specializations" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "specialization_name" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION,

    CONSTRAINT "hospital_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_facilities" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "facility_name" TEXT NOT NULL,

    CONSTRAINT "hospital_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_cost_estimates" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "medical_category" TEXT NOT NULL,
    "condition_name" TEXT,
    "procedure_name" TEXT,
    "consultation_cost" DOUBLE PRECISION,
    "diagnostics_cost" DOUBLE PRECISION,
    "stay_cost" DOUBLE PRECISION,
    "surgery_cost" DOUBLE PRECISION,
    "contingency_cost" DOUBLE PRECISION,
    "city" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_cost_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_sources" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_rating" DOUBLE PRECISION,
    "source_review_count" INTEGER,
    "last_scraped_at" TIMESTAMPTZ,

    CONSTRAINT "hospital_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_search_cache" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "search_keywords" TEXT[],
    "matched_conditions" TEXT[],
    "specialization_match_score" DOUBLE PRECISION,
    "last_seen_online" TIMESTAMPTZ,
    "source_platforms" TEXT[],

    CONSTRAINT "hospital_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemMetadata_key_key" ON "SystemMetadata"("key");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_intelligence_hospital_id_key" ON "hospital_intelligence"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_review_insights_hospital_id_key" ON "hospital_review_insights"("hospital_id");

-- AddForeignKey
ALTER TABLE "hospital_intelligence" ADD CONSTRAINT "hospital_intelligence_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_review_insights" ADD CONSTRAINT "hospital_review_insights_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_specializations" ADD CONSTRAINT "hospital_specializations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_facilities" ADD CONSTRAINT "hospital_facilities_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_cost_estimates" ADD CONSTRAINT "hospital_cost_estimates_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_sources" ADD CONSTRAINT "hospital_sources_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_search_cache" ADD CONSTRAINT "hospital_search_cache_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
