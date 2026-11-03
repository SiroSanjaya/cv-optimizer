ALTER TYPE "ApplicationStatus" ADD VALUE 'preparing_documents';
ALTER TYPE "ApplicationStatus" ADD VALUE 'hr_screening';
ALTER TYPE "ApplicationStatus" ADD VALUE 'assessment_test';
ALTER TYPE "ApplicationStatus" ADD VALUE 'technical_interview';
ALTER TYPE "ApplicationStatus" ADD VALUE 'final_interview';
ALTER TYPE "ApplicationStatus" ADD VALUE 'hired';

ALTER TABLE "CvVersion"
ADD COLUMN "sourceJobId" TEXT;

CREATE UNIQUE INDEX "CvVersion_sourceJobId_key" ON "CvVersion"("sourceJobId");

CREATE TABLE "CareerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "structuredCv" JSONB NOT NULL DEFAULT '{}',
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "preferredIndustries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "preferredLocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "employmentPreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expectedSalaryMin" INTEGER,
    "expectedSalaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");

CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salary" TEXT,
    "type" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "matchScore" INTEGER,
    "postedAtDate" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedJob_userId_externalId_key" ON "SavedJob"("userId", "externalId");
CREATE INDEX "SavedJob_userId_savedAt_idx" ON "SavedJob"("userId", "savedAt");

ALTER TABLE "CareerProfile"
ADD CONSTRAINT "CareerProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedJob"
ADD CONSTRAINT "SavedJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
