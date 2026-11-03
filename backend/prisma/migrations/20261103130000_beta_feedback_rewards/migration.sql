ALTER TABLE "UsageCredit"
ADD COLUMN "bonusCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AiJobReservation"
ADD COLUMN "creditSource" TEXT NOT NULL DEFAULT 'monthly';

CREATE TABLE "BetaFeedbackReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaFeedbackReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaFeedbackReward_userId_key"
ON "BetaFeedbackReward"("userId");

ALTER TABLE "BetaFeedbackReward"
ADD CONSTRAINT "BetaFeedbackReward_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
