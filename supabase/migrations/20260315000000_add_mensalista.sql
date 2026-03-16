-- =====================================================================
-- Borafut — Mensalista (Monthly Subscriber) Feature
-- Migration: 20260315000000_add_mensalista.sql
-- =====================================================================

-- ── 1. Adicionar coluna subscriptionType em group_members ───────────

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS "subscriptionType" text DEFAULT 'AVULSO'
  CHECK ("subscriptionType" IN ('MENSALISTA', 'AVULSO'));

-- ── 2. RPC: Admin toggle subscription_type do membro ────────────────

CREATE OR REPLACE FUNCTION public.update_member_subscription(
    p_member_id uuid,
    p_subscription_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id uuid;
    v_user_id uuid;
BEGIN
    -- Validar o valor
    IF p_subscription_type NOT IN ('MENSALISTA', 'AVULSO') THEN
        RAISE EXCEPTION 'Tipo de assinatura inválido: %', p_subscription_type;
    END IF;

    -- Buscar dados do membro
    SELECT "groupId", "userId" INTO v_group_id, v_user_id
    FROM public.group_members
    WHERE id = p_member_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Membro não encontrado';
    END IF;

    -- Verificar permissão: SuperAdmin ou Admin do grupo
    IF NOT public.is_super_admin() AND NOT public.is_group_admin(v_group_id) THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar o tipo de assinatura';
    END IF;

    -- Atualizar
    UPDATE public.group_members
    SET "subscriptionType" = p_subscription_type
    WHERE id = p_member_id;

    -- Auditoria
    INSERT INTO public.audit_log ("actorId", action, "targetId", "targetType", metadata)
    VALUES (
        auth.uid(),
        'MEMBER_SUBSCRIPTION_UPDATED',
        v_user_id,
        'user',
        jsonb_build_object('memberId', p_member_id, 'newSubscriptionType', p_subscription_type, 'groupId', v_group_id)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_subscription(uuid, text) TO authenticated;

-- ── 3. RPC: Inscrição inteligente com prioridade de mensalista ──────

CREATE OR REPLACE FUNCTION public.register_for_match(
    p_match_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_group_id uuid;
    v_max_players int;
    v_match_status text;
    v_subscription_type text;
    v_occupied int;
    v_final_status text;
    v_displaced_id uuid := NULL;
    v_displaced_user_id uuid := NULL;
    v_last_reserved_avulso RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Buscar dados da partida
    SELECT "groupId", "maxPlayers", status INTO v_group_id, v_max_players, v_match_status
    FROM public.matches
    WHERE id = p_match_id;

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Partida não encontrada';
    END IF;

    IF v_match_status != 'OPEN' THEN
        RAISE EXCEPTION 'Partida não está aberta para inscrições';
    END IF;

    -- Verificar se é membro do grupo
    IF NOT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE "groupId" = v_group_id AND "userId" = v_user_id
    ) THEN
        RAISE EXCEPTION 'Você não é membro deste grupo';
    END IF;

    -- Verificar duplicata
    IF EXISTS (
        SELECT 1 FROM public.match_registrations
        WHERE "matchId" = p_match_id AND "userId" = v_user_id
    ) THEN
        RAISE EXCEPTION 'Você já está inscrito nesta partida';
    END IF;

    -- Buscar subscriptionType do jogador neste grupo
    SELECT COALESCE(gm."subscriptionType", 'AVULSO') INTO v_subscription_type
    FROM public.group_members gm
    WHERE gm."groupId" = v_group_id AND gm."userId" = v_user_id;

    -- Contar vagas ocupadas (CONFIRMED + RESERVED)
    SELECT COUNT(*) INTO v_occupied
    FROM public.match_registrations
    WHERE "matchId" = p_match_id AND status IN ('CONFIRMED', 'RESERVED');

    -- Determinar o status final
    IF v_occupied < v_max_players THEN
        -- Cenário A: há vagas
        IF v_subscription_type = 'MENSALISTA' THEN
            v_final_status := 'CONFIRMED';
        ELSE
            v_final_status := 'RESERVED';
        END IF;
    ELSE
        -- Vagas cheias
        IF v_subscription_type = 'MENSALISTA' THEN
            -- Cenário B: tentar deslocar o último avulso RESERVED
            SELECT r.id, r."userId" INTO v_last_reserved_avulso
            FROM public.match_registrations r
            JOIN public.group_members gm ON gm."groupId" = v_group_id AND gm."userId" = r."userId"
            WHERE r."matchId" = p_match_id
              AND r.status = 'RESERVED'
              AND COALESCE(gm."subscriptionType", 'AVULSO') = 'AVULSO'
            ORDER BY r."createdAt" DESC
            LIMIT 1;

            IF v_last_reserved_avulso.id IS NOT NULL THEN
                -- Deslocar avulso para WAITLIST
                UPDATE public.match_registrations
                SET status = 'WAITLIST'
                WHERE id = v_last_reserved_avulso.id;

                v_displaced_id := v_last_reserved_avulso.id;
                v_displaced_user_id := v_last_reserved_avulso."userId";
                v_final_status := 'CONFIRMED';
            ELSE
                -- Cenário C: todos CONFIRMED, mensalista vai pra fila
                v_final_status := 'WAITLIST';
            END IF;
        ELSE
            -- Avulso sem vaga -> WAITLIST
            v_final_status := 'WAITLIST';
        END IF;
    END IF;

    INSERT INTO public.match_registrations ("matchId", "userId", status)
    VALUES (p_match_id, v_user_id, v_final_status);

    -- Auditoria
    INSERT INTO public.audit_log ("actorId", action, "targetId", "targetType", metadata)
    VALUES (
        v_user_id,
        'MATCH_REGISTERED',
        p_match_id,
        'match',
        jsonb_build_object(
            'status', v_final_status,
            'subscriptionType', v_subscription_type,
            'displacedRegistrationId', v_displaced_id,
            'displacedUserId', v_displaced_user_id
        )
    );

    -- Retornar resultado
    RETURN jsonb_build_object(
        'status', v_final_status,
        'subscriptionType', v_subscription_type,
        'displacedRegistrationId', v_displaced_id,
        'displacedUserId', v_displaced_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_match(uuid) TO authenticated;
