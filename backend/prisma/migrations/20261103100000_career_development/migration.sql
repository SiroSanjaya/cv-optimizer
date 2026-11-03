CREATE TABLE "CareerDevelopmentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "jobCount" INTEGER NOT NULL,
    "skillDemand" JSONB NOT NULL,
    "skillGaps" JSONB NOT NULL,
    "learningRecommendations" JSONB NOT NULL,
    "portfolioProjects" JSONB NOT NULL,
    "certifications" JSONB NOT NULL,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerDevelopmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerDevelopmentPlan_userId_key" ON "CareerDevelopmentPlan"("userId");

ALTER TABLE "CareerDevelopmentPlan"
ADD CONSTRAINT "CareerDevelopmentPlan_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
