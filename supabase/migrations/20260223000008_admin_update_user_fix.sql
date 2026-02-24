create or replace function public.admin_update_user_profile(
    p_user_id uuid,
    p_global_score numeric,
    p_main_position text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid;
    v_is_super boolean;
    v_old_score numeric;
    v_old_position text;
begin
    v_admin_id := auth.uid();
    
    -- Ensure executed by an authenticated user
    if v_admin_id is null then
        raise exception 'Não autorizado';
    end if;

    -- Check if the executor is a Super Admin
    select "isSuperAdmin" into v_is_super
    from public.users
    where id = v_admin_id;

    if not coalesce(v_is_super, false) then
        raise exception 'Apenas Super Admins podem alterar perfis de outros usuários';
    end if;

    -- Get old values for auditing
    select "globalScore", "mainPosition" into v_old_score, v_old_position
    from public.users
    where id = p_user_id;

    -- Update the user profile
    update public.users
    set 
        "globalScore" = p_global_score,
        "mainPosition" = p_main_position
    where id = p_user_id;

    -- Log the action
    insert into public.audit_log (
        "groupId",
        "actorId",
        action,
        "targetId",
        "targetType",
        metadata
    ) values (
        null, -- Global action, no specific group
        v_admin_id,
        'MEMBER_UPDATED',
        p_user_id,
        'USER',
        jsonb_build_object(
            'oldScore', v_old_score,
            'newScore', p_global_score,
            'oldPosition', v_old_position,
            'newPosition', p_main_position
        )
    );
end;
$$;
