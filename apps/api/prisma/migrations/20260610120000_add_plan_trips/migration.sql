-- CreateTable
CREATE TABLE "plan_trips" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "dates_label" TEXT NOT NULL DEFAULT '',
    "members" JSONB NOT NULL DEFAULT '[]',
    "transport" JSONB NOT NULL DEFAULT '[]',
    "accommodation" JSONB NOT NULL DEFAULT '{}',
    "itinerary" JSONB NOT NULL DEFAULT '{"days":[]}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_trips_slug_key" ON "plan_trips"("slug");
