-- Migration: Match MVPs — multiple MVPs per match (tie support)
-- Creates a junction table to persist the Craque(s) da Partida

CREATE TABLE IF NOT EXISTS public.match_mvps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "matchId" uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    "userId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "avgScore" numeric NOT NULL DEFAULT 0,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("matchId", "userId")
);

ALTER TABLE public.match_mvps ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone who can see the match can see MVPs
CREATE POLICY "match_mvps_select" ON public.match_mvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.group_members gm ON gm."groupId" = m."groupId"
      WHERE m.id = match_mvps."matchId" AND gm."userId" = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND "isSuperAdmin" = true
    )
  );

-- Grants
GRANT SELECT, INSERT, DELETE ON TABLE public.match_mvps TO authenticated;

-- RPC: Calculate and persist MVPs for a match
-- Called by the admin (or automatically). Computes AVG(scoreGiven) per player,
-- then inserts ALL players who share the highest average.
CREATE OR REPLACE FUNCTION public.compute_match_mvps(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_max_avg numeric;
BEGIN
    -- Only process CLOSED or FINISHED matches
    IF NOT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id AND status IN ('CLOSED', 'FINISHED')
    ) THEN
        RETURN; -- silently skip
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

    -- If no evaluations exist, nothing to do
    IF v_max_avg IS NULL THEN
        RETURN;
    END IF;

    -- Insert ALL players with the max average
    INSERT INTO public.match_mvps ("matchId", "userId", "avgScore")
    SELECT p_match_id, "evaluatedId", ROUND(AVG("scoreGiven")::numeric, 2)
    FROM public.evaluations
    WHERE "matchId" = p_match_id
    GROUP BY "evaluatedId"
    HAVING ROUND(AVG("scoreGiven")::numeric, 2) = v_max_avg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_match_mvps(uuid) TO authenticated;
