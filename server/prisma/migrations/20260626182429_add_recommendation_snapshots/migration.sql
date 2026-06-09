-- CreateTable
CREATE TABLE "recommendation_snapshots" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "hospital_name" TEXT NOT NULL,
    "ranking_position" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL,
    "estimated_cost" TEXT NOT NULL,
    "distance" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recommendation_snapshots" ADD CONSTRAINT "recommendation_snapshots_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
