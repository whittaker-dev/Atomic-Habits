-- CreateEnum
CREATE TYPE "PlanTripDayPart" AS ENUM ('morning', 'afternoon', 'evening');

-- AlterTable
ALTER TABLE "plan_trips" ADD COLUMN     "end_date" DATE,
ADD COLUMN     "end_day_part" "PlanTripDayPart",
ADD COLUMN     "start_date" DATE,
ADD COLUMN     "start_day_part" "PlanTripDayPart";

-- Backfill: only the two default labels we shipped (en + vi) can be parsed safely.
-- Anything a user typed stays in dates_label as the display fallback.
UPDATE "plan_trips"
SET "start_date" = DATE '2026-05-03',
    "start_day_part" = 'afternoon',
    "end_date" = DATE '2026-05-05',
    "end_day_part" = 'morning',
    "dates_label" = ''
WHERE "dates_label" IN ('Sun 3 May PM – Tue 5 May AM 2026', 'Chiều CN 3/5 – Sáng T3 5/5/2026');
