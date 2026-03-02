-- Migration: Update compute_match_mvps to return the count of MVPs found
-- Must DROP first because PostgreSQL does not allow changing return type via CREATE OR REPLACE

DROP FUNCTION IF EXISTS public.compute_match_mvps(uuid);

CREATE FUNCTION public.compute_match_mvps(p_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_max_avg numeric;
    v_count integer := 0;
BEGIN
    -- Only process CLOSED or FINISHED matches
    IF NOT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id AND status IN ('CLOSED', 'FINISHED')
    ) THEN
        RETURN 0;
    END IF;

    -- Clear any previous MVPs for this match
    DELETE FROM public.match_mvps WHERE "matchId" = p_match_id;

    -- Find the max average score
    SELECT MAX(avg_score) INTO v_max_avg
    FROM (
        SELECT "evaluatedId", ROUND(AVG("scoreGiven")::numeric, 2) AS avg_score
        FROM public.evaluations
        WHERE "matchId" = p_match_id
        GROUP BY "evaluatedId"
    ) sub;

    -- If no evaluations exist, return 0
    IF v_max_avg IS NULL THEN
        RETURN 0;
    END IF;

    -- Insert ALL players with the max average
    INSERT INTO public.match_mvps ("matchId", "userId", "avgScore")
    SELECT p_match_id, "evaluatedId", ROUND(AVG("scoreGiven")::numeric, 2)
    FROM public.evaluations
    WHERE "matchId" = p_match_id
    GROUP BY "evaluatedId"
    HAVING ROUND(AVG("scoreGiven")::numeric, 2) = v_max_avg;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_match_mvps(uuid) TO authenticated;
