-- Migration: Allow group admins to add players to matches
-- Fixes: RLS violation when admin inserts match_registrations for another user

-- New INSERT policy: group admins can add any group member to a match in their group
CREATE POLICY "registrations_insert_group_admin" ON public.match_registrations
  FOR INSERT WITH CHECK (
    -- The current user must be a group admin for the match's group
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.group_members gm ON gm."groupId" = m."groupId"
      WHERE m.id = "matchId"
        AND gm."userId" = auth.uid()
        AND gm.role = 'ADMIN'
    )
    -- And the target user must be a member of the same group
    AND EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.group_members gm ON gm."groupId" = m."groupId"
      WHERE m.id = "matchId"
        AND gm."userId" = match_registrations."userId"
    )
  );
