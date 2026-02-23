-- =====================================================================
-- Borafut — Add DELETE Policies for Super Admins
-- Migration: 20260223000001_superadmin_delete.sql
-- =====================================================================

-- ── 1. GROUPS ────────────────────────────────────────────────────────

CREATE POLICY "groups_delete_superadmin" ON public.groups
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true)
  );

-- ── 2. MATCHES ────────────────────────────────────────────────────────

CREATE POLICY "matches_delete_superadmin" ON public.matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true)
  );

-- ── 3. MATCH REGISTRATIONS ────────────────────────────────────────────

CREATE POLICY "registrations_delete_superadmin" ON public.match_registrations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true)
  );

-- ── 4. GROUP MEMBERS ──────────────────────────────────────────────────

CREATE POLICY "group_members_delete_superadmin" ON public.group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true)
  );

-- ── 5. EVALUATIONS ────────────────────────────────────────────────────

CREATE POLICY "evaluations_delete_superadmin" ON public.evaluations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true)
  );
