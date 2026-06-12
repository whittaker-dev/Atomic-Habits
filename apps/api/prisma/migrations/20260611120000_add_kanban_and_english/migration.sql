-- CreateEnum
CREATE TYPE "KanbanColumn" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "EnglishChallengeType" AS ENUM ('vocabulary', 'quiz', 'phrase');

-- CreateTable
CREATE TABLE "kanban_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "column" "KanbanColumn" NOT NULL DEFAULT 'todo',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "english_challenges" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "EnglishChallengeType" NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "english_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "english_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "english_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kanban_tasks_user_id_column_sort_order_idx" ON "kanban_tasks"("user_id", "column", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "english_challenges_date_key" ON "english_challenges"("date");

-- CreateIndex
CREATE INDEX "english_submissions_user_id_submitted_at_idx" ON "english_submissions"("user_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "english_submissions_user_id_challenge_id_key" ON "english_submissions"("user_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "english_submissions" ADD CONSTRAINT "english_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "english_submissions" ADD CONSTRAINT "english_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "english_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
