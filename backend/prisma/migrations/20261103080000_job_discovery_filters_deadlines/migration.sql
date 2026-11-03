ALTER TABLE "SavedJob"
ADD COLUMN "salaryMin" DOUBLE PRECISION,
ADD COLUMN "salaryMax" DOUBLE PRECISION,
ADD COLUMN "salaryCurrency" TEXT,
ADD COLUMN "salaryPeriod" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "experienceLevel" TEXT,
ADD COLUMN "matchingSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "missingSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "applyRecommendation" TEXT,
ADD COLUMN "applicationDeadline" TIMESTAMP(3);
