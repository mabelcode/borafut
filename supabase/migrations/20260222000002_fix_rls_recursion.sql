-- =====================================================================
-- Borafut — Fix RLS Recursion
-- Migration: 20260222000002_fix_rls_recursion.sql
-- =====================================================================

-- 1. Create a security definer function to check membership.
-- This function runs with the privileges of the creator (postgres),
-- bypassing RLS for its internal query, which breaks the recursion.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.group_members
    where "groupId" = p_group_id and "userId" = auth.uid()
  );
$$;

-- 2. Drop old policies that cause recursion
drop policy if exists "groups_select" on public.groups;
drop policy if exists "group_members_select" on public.group_members;

-- 3. Recreate policies using the helper function
create policy "groups_select" on public.groups
  for select using (
    is_group_member(id)
    or exists (
      select 1 from public.users
      where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "group_members_select" on public.group_members
  for select using (
    is_group_member("groupId")
    or exists (
      select 1 from public.users
      where id = auth.uid() and "isSuperAdmin" = true
    )
  );

-- 4. Grant execute to authenticated users
grant execute on function public.is_group_member(uuid) to authenticated;
