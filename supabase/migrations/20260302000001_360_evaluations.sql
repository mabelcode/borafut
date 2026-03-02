-- =====================================================================
-- Borafut — 360 Player Evaluations
-- Migration: 20260302000001_360_evaluations.sql
-- =====================================================================

-- 1. Modificar a proteção de campos sensíveis para permitir atualizações internas autorizadas.
-- Adicionamos uma variável de sessão local (borafut.bypass_score_protection) que o trigger
-- de recálculo de nota pode ativar para atualizar o globalScore de forma segura.
CREATE OR REPLACE FUNCTION public.protect_user_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Se quem está alterando não for Super Admin e não tiver a flag de bypass ativa
    IF NOT public.is_super_admin() AND current_setting('borafut.bypass_score_protection', true) IS DISTINCT FROM 'true' THEN
        NEW."isSuperAdmin" := OLD."isSuperAdmin";
        NEW."globalScore" := OLD."globalScore";
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Trigger para recalcular automaticamente a nota global do jogador avaliado.
-- Dispara após INSERT, UPDATE ou DELETE na tabela evaluations.
-- Calcula a média de todas as avaliações recebidas por esse jogador (em TODAS as partidas).
CREATE OR REPLACE FUNCTION public.update_user_global_score_on_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_avg numeric;
    v_target_id uuid;
BEGIN
    -- Identifica o jogador que foi avaliado
    IF TG_OP = 'DELETE' THEN
        v_target_id := OLD."evaluatedId";
    ELSE
        v_target_id := NEW."evaluatedId";
    END IF;

    -- Calcula a nova média arredondada
    SELECT COALESCE(ROUND(AVG("scoreGiven")::numeric, 2), 3.0)
    INTO v_new_avg
    FROM public.evaluations
    WHERE "evaluatedId" = v_target_id;

    -- Ativa a flag para que o trigger de proteção permita a escrita
    PERFORM set_config('borafut.bypass_score_protection', 'true', true);

    -- Atualiza a nota global do jogador
    UPDATE public.users
    SET "globalScore" = v_new_avg
    WHERE id = v_target_id;

    -- Limpa a flag
    PERFORM set_config('borafut.bypass_score_protection', '', true);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_global_score_on_evaluation ON public.evaluations;
CREATE TRIGGER trg_update_user_global_score_on_evaluation
    AFTER INSERT OR UPDATE OR DELETE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_global_score_on_evaluation();


-- 3. RPC para enviar/atualizar múltiplas avaliações de uma vez de forma segura.
-- Recebe o ID da partida e um array JSON: [{"evaluatedId": "uuid", "scoreGiven": 4}, ...]
-- Valida:
--   a) Partida deve estar CLOSED ou FINISHED
--   b) Avaliador deve ter status CONFIRMED na partida
--   c) Avaliado deve ter status CONFIRMED na partida
--   d) Nota deve estar entre 1 e 5
--   e) Auto-avaliações são ignoradas silenciosamente
CREATE OR REPLACE FUNCTION public.submit_match_evaluations(p_match_id uuid, p_evaluations jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_evaluator_id uuid := auth.uid();
    v_match_status text;
    v_evaluator_status text;
    v_eval jsonb;
    v_evaluated_id uuid;
    v_score_given int;
    v_evaluated_status text;
BEGIN
    -- Validações gerais
    IF v_evaluator_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- 1. Verificar status da partida
    SELECT status INTO v_match_status
    FROM public.matches
    WHERE id = p_match_id;

    IF v_match_status IS NULL OR v_match_status NOT IN ('CLOSED', 'FINISHED') THEN
        RAISE EXCEPTION 'Avaliações só permitidas após o fechamento da partida.';
    END IF;

    -- 2. Verificar se o avaliador participou da partida
    SELECT status INTO v_evaluator_status
    FROM public.match_registrations
    WHERE "matchId" = p_match_id AND "userId" = v_evaluator_id;

    IF v_evaluator_status IS NULL OR v_evaluator_status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Apenas jogadores confirmados podem enviar avaliações.';
    END IF;

    -- 3. Processar cada avaliação
    FOR v_eval IN SELECT * FROM jsonb_array_elements(p_evaluations)
    LOOP
        v_evaluated_id := (v_eval->>'evaluatedId')::uuid;
        v_score_given := (v_eval->>'scoreGiven')::int;

        -- Validar range da nota
        IF v_score_given < 1 OR v_score_given > 5 THEN
            RAISE EXCEPTION 'A nota deve ser entre 1 e 5.';
        END IF;

        -- Ignorar auto-avaliações silenciosamente
        IF v_evaluator_id = v_evaluated_id THEN
            CONTINUE;
        END IF;

        -- Verificar se o avaliado participou da partida
        SELECT status INTO v_evaluated_status
        FROM public.match_registrations
        WHERE "matchId" = p_match_id AND "userId" = v_evaluated_id;

        IF v_evaluated_status IS NULL OR v_evaluated_status != 'CONFIRMED' THEN
            CONTINUE; -- Ignorar jogadores não confirmados silenciosamente
        END IF;

        -- Upsert da avaliação (insere ou atualiza se já existir)
        INSERT INTO public.evaluations ("matchId", "evaluatorId", "evaluatedId", "scoreGiven")
        VALUES (p_match_id, v_evaluator_id, v_evaluated_id, v_score_given)
        ON CONFLICT ("matchId", "evaluatorId", "evaluatedId")
        DO UPDATE SET
            "scoreGiven" = EXCLUDED."scoreGiven",
            "createdAt" = now();

    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_match_evaluations(uuid, jsonb) TO authenticated;
