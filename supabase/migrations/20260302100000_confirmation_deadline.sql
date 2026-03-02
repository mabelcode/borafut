-- =====================================================================
-- Borafut — Add configurable confirmation deadline to matches
-- Migration: 20260302100000_confirmation_deadline.sql
-- Adds a column to control how many hours players have to confirm
-- their reservation (default: 48 hours).
-- =====================================================================

-- 1. Add the column (nullable initially for safe migration)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS "confirmationDeadlineHours" int DEFAULT 48;

-- 2. Sanitize existing data: ensure no NULL or invalid values
UPDATE public.matches
  SET "confirmationDeadlineHours" = 48
  WHERE "confirmationDeadlineHours" IS NULL
     OR "confirmationDeadlineHours" <= 0;

-- 3. Set NOT NULL constraint now that data is clean
ALTER TABLE public.matches
  ALTER COLUMN "confirmationDeadlineHours" SET NOT NULL;

ALTER TABLE public.matches
  ALTER COLUMN "confirmationDeadlineHours" SET DEFAULT 48;

-- 4. Add CHECK constraint to prevent zero/negative values
ALTER TABLE public.matches
  ADD CONSTRAINT matches_confirmation_deadline_positive
  CHECK ("confirmationDeadlineHours" > 0);
