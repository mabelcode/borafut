-- =====================================================================
-- Borafut — Add Invite Token RPC
-- Migration: 20260223000002_invite_rpc.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_group_by_token(token_text text)
RETURNS TABLE (
  id uuid,
  name text,
  "inviteExpiresAt" timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Essential: bypasses RLS for this specific query
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name, g."inviteExpiresAt"
  FROM groups g
  WHERE g."inviteToken" = token_text;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_group_by_token(text) TO authenticated;
