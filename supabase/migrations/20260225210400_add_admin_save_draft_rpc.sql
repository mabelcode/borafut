-- Migration params:
-- Array of JSON objects for the teams
-- Each object has: { matchId, registrationId, teamNumber, snapshotPosition, snapshotScore }
-- We will close the match when this is done.

CREATE OR REPLACE FUNCTION admin_save_draft(
    p_match_id UUID,
    p_draft_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_is_group_admin BOOLEAN;
    v_group_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Authentication and Authorization Check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user is Super Admin
    SELECT "isSuperAdmin" INTO v_is_super_admin FROM users WHERE id = auth.uid();

    -- Get Group ID for the match
    SELECT "groupId" INTO v_group_id FROM matches WHERE id = p_match_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- Check if user is Group Admin
    SELECT EXISTS (
        SELECT 1 FROM group_members 
        WHERE "groupId" = v_group_id 
        AND "userId" = auth.uid() 
        AND role = 'ADMIN'
    ) INTO v_is_group_admin;

    -- Only allow Super Admins or Group Admins
    IF NOT COALESCE(v_is_super_admin, false) AND NOT COALESCE(v_is_group_admin, false) THEN
        RAISE EXCEPTION 'Unauthorized: Must be Super Admin or Group Admin';
    END IF;

    -- 2. Bulk Update Registrations
    -- p_draft_data should be an array of: {"registrationId": "uuid", "teamNumber": 1, "snapshotScore": 4.5, "snapshotPosition": "ATTACK"}
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_draft_data)
    LOOP
        UPDATE match_registrations
        SET 
            "teamNumber" = (v_item->>'teamNumber')::INT,
            "snapshotScore" = (v_item->>'snapshotScore')::NUMERIC,
            "snapshotPosition" = v_item->>'snapshotPosition'
        WHERE id = (v_item->>'registrationId')::UUID
          AND "matchId" = p_match_id;
    END LOOP;

    -- 3. Close the Match
    UPDATE matches
    SET status = 'CLOSED'
    WHERE id = p_match_id;

    -- 4. Audit Log
    INSERT INTO audit_log ("actorId", action, "targetType", "targetId", metadata)
    VALUES (
        auth.uid(),
        'SAVE_MATCH_DRAFT',
        'match',
        p_match_id,
        jsonb_build_object('playerCount', jsonb_array_length(p_draft_data))
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant EXECUTE permission to authenticated users (RLS is checked inside the function)
GRANT EXECUTE ON FUNCTION admin_save_draft(UUID, JSONB) TO authenticated;
