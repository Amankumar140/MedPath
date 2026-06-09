-- CreateTable
CREATE TABLE "hospital_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "recommendation_snapshot_id" UUID NOT NULL,
    "hospital_name" TEXT NOT NULL,
    "visited" BOOLEAN,
    "treatment_type" TEXT,
    "estimated_cost" TEXT,
    "actual_cost" DOUBLE PRECISION,
    "cost_accuracy" TEXT,
    "waiting_time" TEXT,
    "facility_rating" INTEGER,
    "doctor_rating" INTEGER,
    "recommend_recommendation" TEXT,
    "medpath_rating" INTEGER,
    "review_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospital_reviews_recommendation_snapshot_id_key" ON "hospital_reviews"("recommendation_snapshot_id");

-- AddForeignKey
ALTER TABLE "hospital_reviews" ADD CONSTRAINT "hospital_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_reviews" ADD CONSTRAINT "hospital_reviews_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_reviews" ADD CONSTRAINT "hospital_reviews_recommendation_snapshot_id_fkey" FOREIGN KEY ("recommendation_snapshot_id") REFERENCES "recommendation_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
