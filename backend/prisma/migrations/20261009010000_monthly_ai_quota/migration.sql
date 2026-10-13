ALTER TABLE "UsageCredit"
ADD COLUMN "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "UsageCredit"
SET
  "periodStart" = date_trunc('month', CURRENT_TIMESTAMP),
  "limit" = 10;
