-- CreateEnum
CREATE TYPE "public"."RoutinaryFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "public"."services" ADD COLUMN     "isRoutinary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routinaryFrequency" "public"."RoutinaryFrequency",
ADD COLUMN     "routinaryLastRunDate" TIMESTAMP(3),
ADD COLUMN     "routinaryNextRunDate" TIMESTAMP(3),
ADD COLUMN     "routinaryStartDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "services_isRoutinary_routinaryNextRunDate_idx" ON "public"."services"("isRoutinary", "routinaryNextRunDate");
