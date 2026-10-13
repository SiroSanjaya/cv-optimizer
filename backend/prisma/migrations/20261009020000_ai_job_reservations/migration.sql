CREATE TABLE "AiJobReservation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiJobReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiJobReservation_jobId_key" ON "AiJobReservation"("jobId");
CREATE INDEX "AiJobReservation_userId_periodStart_idx" ON "AiJobReservation"("userId", "periodStart");

ALTER TABLE "AiJobReservation"
ADD CONSTRAINT "AiJobReservation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
