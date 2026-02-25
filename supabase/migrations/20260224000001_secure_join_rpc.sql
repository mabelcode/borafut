-- =====================================================================
-- Borafut — Secure Group Join RPC
-- Migration: 20260224000001_secure_join_rpc.sql
-- =====================================================================

-- 1. Create a function to securely join a group via token
CREATE OR REPLACE FUNCTION public.join_group_via_token(token_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id uuid;
    v_expires_at timestamptz;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Find group and check expiration
    SELECT id, "inviteExpiresAt" INTO v_group_id, v_expires_at
    FROM groups
    WHERE "inviteToken" = token_text;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Link de convite inválido';
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
        RAISE EXCEPTION 'Link de convite expirado';
    END IF;

    -- Check if already a member to avoid unique constraint error
    IF EXISTS (SELECT 1 FROM group_members WHERE "groupId" = v_group_id AND "userId" = v_user_id) THEN
        RETURN;
    END IF;

    -- Join group
    INSERT INTO group_members ("groupId", "userId", role)
    VALUES (v_group_id, v_user_id, 'PLAYER');
END;
$$;

-- 2. Revoke insert on group_members for most users to enforce RPC usage
-- Note: Super Admins still have their bypass via policies if we keep them, 
-- but here we want to ensure regular players can only join via token.

DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_admin" ON public.group_members;

-- Only super admins can insert directly
CREATE POLICY "group_members_insert_superadmin" ON public.group_members
  FOR INSERT WITH CHECK (
    public.is_super_admin()
  );

-- 3. Grants
GRANT EXECUTE ON FUNCTION public.join_group_via_token(text) TO authenticated;
