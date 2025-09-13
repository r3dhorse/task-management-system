-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "taskNumber" TEXT;

-- Create a temporary sequence for numbering existing tasks
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- Update existing tasks with sequential task numbers ordered by creation date
UPDATE "tasks"
SET "taskNumber" = 'Task #' || LPAD(sub.row_number::TEXT, 7, '0')
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as row_number
    FROM "tasks"
    WHERE "taskNumber" IS NULL
) as sub
WHERE "tasks".id = sub.id;

-- Drop the temporary sequence
DROP SEQUENCE task_number_seq;

-- Now make the column NOT NULL and add unique constraint
ALTER TABLE "tasks" ALTER COLUMN "taskNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskNumber_key" ON "tasks"("taskNumber");