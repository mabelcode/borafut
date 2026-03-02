-- =====================================================================
-- Borafut — Add configurable confirmation deadline to matches
-- Migration: 20260302100000_confirmation_deadline.sql
-- Adds a column to control how many hours players have to confirm
-- their reservation (default: 48 hours).
-- =====================================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS "confirmationDeadlineHours" int DEFAULT 48;
