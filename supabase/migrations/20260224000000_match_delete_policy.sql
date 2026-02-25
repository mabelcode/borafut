-- =====================================================================
-- Borafut — Add Match Delete Policies for Group Admins
-- Migration: 20260224000000_match_delete_policy.sql
-- =====================================================================

-- This migration adds the missing DELETE policies to allow Group Admins
-- (not just Super Admins) to remove matches and registrations.

-- 1. Allow Group Admins to delete matches within their group
DROP POLICY IF EXISTS "matches_delete_group_admin" ON public.matches;
CREATE POLICY "matches_delete_group_admin" ON public.matches
  FOR DELETE USING (
    public.is_group_admin("groupId")
  );

-- 2. Allow Group Admins to delete registrations for matches in their group
DROP POLICY IF EXISTS "registrations_delete_group_admin" ON public.match_registrations;
CREATE POLICY "registrations_delete_group_admin" ON public.match_registrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = public.match_registrations."matchId"
      AND public.is_group_admin(m."groupId")
    )
  );
