CREATE TABLE IF NOT EXISTS "AiCostLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "jobId" TEXT,
  "taskType" TEXT NOT NULL,
  "model" TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'success',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiCostLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AiCostLog_userId_fkey'
  ) THEN
    ALTER TABLE "AiCostLog"
    ADD CONSTRAINT "AiCostLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AiCostLog_taskType_idx" ON "AiCostLog"("taskType");
CREATE INDEX IF NOT EXISTS "AiCostLog_createdAt_idx" ON "AiCostLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AiCostLog_userId_createdAt_idx" ON "AiCostLog"("userId", "createdAt");
