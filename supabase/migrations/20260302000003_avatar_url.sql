-- Migration: Add avatarUrl column to users table
-- Stores the Google OAuth profile picture URL for all users

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "avatarUrl" text;

-- Allow the user to update their own avatarUrl
-- (Already covered by the existing UPDATE policy: userId = auth.uid())
