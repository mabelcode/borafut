-- =====================================================================
-- Borafut — Security Fixes (Privilege Escalation & Validations)
-- Migration: 20260302000000_security_fixes.sql
-- =====================================================================

-- 1. Defesa contra Escalação de Privilégios (Tabela users)
-- Explicação: Impedir que o usuário mal-intencionado altere isSuperAdmin e globalScore.
-- Somente Super Admins podem alterar essas colunas. Se o usuário comum tentar, revertemos para o OLD.

CREATE OR REPLACE FUNCTION public.protect_user_sensitive_fields()
RETURNS trigger AS $$
BEGIN
    SET search_path = public, pg_temp;
    -- Se quem está alterando não for Super Admin
    IF NOT public.is_super_admin() THEN
        -- Reverter tentativas de alteração de campos sensíveis para o valor antigo
        NEW."isSuperAdmin" := OLD."isSuperAdmin";
        NEW."globalScore" := OLD."globalScore";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_fields ON public.users;
CREATE TRIGGER trg_protect_user_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_sensitive_fields();


-- 2. Defesa contra Bypass de Pagamento (Tabela match_registrations)
-- Explicação: Criar uma RPC dedicada para a confirmação de inscrição e remover do usuário
-- o poder de alterar o status.

-- a) Função RPC para confirmar pagamento
CREATE OR REPLACE FUNCTION public.admin_confirm_payment(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id uuid;
    v_user_id uuid;
BEGIN
    -- Obter o ID do grupo desta partida
    SELECT m."groupId", r."userId" INTO v_group_id, v_user_id
    FROM public.match_registrations r
    JOIN public.matches m ON m.id = r."matchId"
    WHERE r.id = p_registration_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Registro não encontrado';
    END IF;

    -- Verificar se quem executa é Super Admin ou Admin do Grupo
    IF NOT public.is_super_admin() AND NOT public.is_group_admin(v_group_id) THEN
        RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos';
    END IF;

    -- Atualizar o status
    UPDATE public.match_registrations
    SET status = 'CONFIRMED'
    WHERE id = p_registration_id;

    -- Inserir log de auditoria
    INSERT INTO public.audit_log (
        "actorId",
        action,
        "targetId",
        "targetType"
    ) VALUES (
        auth.uid(),
        'CONFIRM_PAYMENT',
        v_user_id,
        'USER'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_payment(uuid) TO authenticated;

-- b) Ajustar RLS do match_registrations para proibir o usuário de auto-confirmar
-- Permitimos que ele se atualize, mas adicionamos um trigger que impede mudança para CONFIRMED.
CREATE OR REPLACE FUNCTION public.protect_registration_status()
RETURNS trigger AS $$
BEGIN
    -- Se o status está mudando para CONFIRMED
    IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' THEN
        -- Apenas admins podem fazer essa transição direta via SQL puro
        -- (Embora recomendemos usar a RPC admin_confirm_payment, isso protege direct updates)
        DECLARE
             v_group_id uuid;
        BEGIN
             SET search_path = public, pg_temp;
             SELECT "groupId" INTO v_group_id FROM public.matches WHERE id = NEW."matchId";
             IF NOT public.is_super_admin() AND NOT public.is_group_admin(v_group_id) THEN
                 RAISE EXCEPTION 'Apenas administradores podem confirmar a inscrição';
             END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_registration_status ON public.match_registrations;
CREATE TRIGGER trg_protect_registration_status
    BEFORE UPDATE OF status ON public.match_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_registration_status();


-- 3. Prevenção de Fraude nas Avaliações
-- Explicação: Permitir inserção de avaliação APENAS se:
--   a) A partida estiver FECHADA ou FINALIZADA
--   b) O Avaliador estava CONFIRMED
--   c) O Avaliado estava CONFIRMED
CREATE OR REPLACE FUNCTION public.protect_evaluations()
RETURNS trigger AS $$
DECLARE
    v_match_status text;
    v_evaluator_status text;
    v_evaluated_status text;
BEGIN
    SET search_path = public, pg_temp;
    -- Validar auto-avaliação
    IF NEW."evaluatorId" = NEW."evaluatedId" THEN
        RAISE EXCEPTION 'Você não pode avaliar a si mesmo.';
    END IF;

    -- Obter o status da partida
    SELECT status INTO v_match_status
    FROM public.matches
    WHERE id = NEW."matchId";

    IF v_match_status IS NULL OR v_match_status NOT IN ('CLOSED', 'FINISHED') THEN
        RAISE EXCEPTION 'Avaliações só permitidas após o fechamento da partida.';
    END IF;

    -- Obter status do Avaliador
    SELECT status INTO v_evaluator_status
    FROM public.match_registrations
    WHERE "matchId" = NEW."matchId" AND "userId" = NEW."evaluatorId";

    IF v_evaluator_status IS NULL OR v_evaluator_status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Apenas jogadores confirmados podem enviar avaliações.';
    END IF;

    -- Obter status do Avaliado
    SELECT status INTO v_evaluated_status
    FROM public.match_registrations
    WHERE "matchId" = NEW."matchId" AND "userId" = NEW."evaluatedId";

    IF v_evaluated_status IS NULL OR v_evaluated_status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Você só pode avaliar jogadores confirmados nesta partida.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_evaluations ON public.evaluations;
CREATE TRIGGER trg_protect_evaluations
    BEFORE INSERT ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_evaluations();
