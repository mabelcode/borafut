-- =====================================================================
-- Borafut — Audit Log Table
-- Migration: 20260223000004_audit_log.sql
-- =====================================================================

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  "actorId"    uuid references public.users (id),
  action       text not null,
  "groupId"    uuid references public.groups (id) on delete set null,
  "targetId"   uuid,
  "targetType" text,
  metadata     jsonb default '{}'::jsonb,
  "createdAt"  timestamptz default now()
);

-- Habilitar RLS
alter table public.audit_log enable row level security;

-- Permissões básicas
grant select, insert on table public.audit_log to authenticated;

-- Políticas de RLS
create policy "audit_log_select_superadmin" on public.audit_log
  for select using (
    exists (select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true)
  );

create policy "audit_log_insert_authenticated" on public.audit_log
  for insert with check (auth.uid() is not null);
