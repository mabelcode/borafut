-- =====================================================================
-- Borafut — Fix RLS Recursion (Part 2: Security Definer Functions)
-- Migration: 20260223000005_fix_rls_properly.sql
-- =====================================================================

-- 1. Create a function to check if the current user is a super admin.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND "isSuperAdmin" = true
  );
$$;

-- 2. Create a function to check if the current user is an admin of a group.
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE "groupId" = p_group_id AND "userId" = auth.uid() AND role = 'ADMIN'
  );
$$;

-- 3. Update group_members policies to use these functions and avoid recursion.
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_admin" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_superadmin" ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (
    is_group_member("groupId") OR is_super_admin()
  );

CREATE POLICY "group_members_insert_admin" ON public.group_members
  FOR INSERT WITH CHECK (
    "userId" = auth.uid() OR is_group_admin("groupId") OR is_super_admin()
  );

CREATE POLICY "group_members_update_admin" ON public.group_members
  FOR UPDATE USING (
    is_group_admin("groupId") OR is_super_admin()
  );

CREATE POLICY "group_members_delete_admin" ON public.group_members
  FOR DELETE USING (
    is_group_admin("groupId") OR is_super_admin()
  );

-- 4. Update groups update policy
DROP POLICY IF EXISTS "groups_update_admin" ON public.groups;
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE USING (
    is_group_admin(id) OR is_super_admin()
  );

-- 5. Grants
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid) TO authenticated;
