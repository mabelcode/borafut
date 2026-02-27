-- =====================================================================
-- Borafut — User Profile Panel: Allow user self-removal from group
-- Migration: 20260225233000_user_profile_rls.sql
-- =====================================================================

-- Allow a user to delete their own membership record from a group
create policy "group_members_delete_self" on public.group_members
  for delete using (auth.uid() = "userId");

-- Also ensure superadmins can delete if necessary
create policy "group_members_delete_superadmin" on public.group_members
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true)
  );
