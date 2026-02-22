-- =====================================================================
-- Borafut — MVP Schema
-- Migration: 20260222000000_init.sql
-- =====================================================================

-- ── 1. USERS ─────────────────────────────────────────────────────────
-- Extends Supabase Auth users. id mirrors auth.users.id.

create table if not exists public.users (
  id             uuid primary key references auth.users (id) on delete cascade,
  "phoneNumber"  text unique,
  "displayName"  text,
  "mainPosition" text check ("mainPosition" in ('GOALKEEPER', 'DEFENSE', 'ATTACK')),
  "globalScore"  numeric default 3.0,
  "isAdmin"      boolean default false,
  "createdAt"    timestamptz default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);


-- ── 2. MATCHES ───────────────────────────────────────────────────────

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  "managerId"   uuid references public.users (id),
  title         text,
  "scheduledAt" timestamptz,
  "maxPlayers"  int,
  price         numeric,  -- Valor da taxa em BRL
  status        text default 'OPEN' check (status in ('OPEN', 'CLOSED', 'FINISHED')),
  "createdAt"   timestamptz default now()
);

alter table public.matches enable row level security;

-- Qualquer usuário autenticado pode ver partidas abertas
create policy "matches_select_all" on public.matches
  for select using (auth.uid() is not null);

-- Só o gerente (admin) pode criar/editar partidas
create policy "matches_insert_admin" on public.matches
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and "isAdmin" = true)
  );

create policy "matches_update_manager" on public.matches
  for update using ("managerId" = auth.uid());


-- ── 3. MATCH REGISTRATIONS ───────────────────────────────────────────

create table if not exists public.match_registrations (
  id                uuid primary key default gen_random_uuid(),
  "matchId"         uuid references public.matches (id) on delete cascade,
  "userId"          uuid references public.users (id),
  "snapshotPosition" text,
  "snapshotScore"   numeric,
  status            text default 'RESERVED'
                    check (status in ('RESERVED', 'CONFIRMED', 'WAITLIST')),
  "paymentId"       text,
  "teamNumber"      int,
  "reservedUntil"   timestamptz,
  "createdAt"       timestamptz default now(),
  unique ("matchId", "userId")
);

alter table public.match_registrations enable row level security;

create policy "registrations_select_all" on public.match_registrations
  for select using (auth.uid() is not null);

-- Usuário só pode inserir sua própria inscrição
create policy "registrations_insert_own" on public.match_registrations
  for insert with check ("userId" = auth.uid());

-- Status CONFIRMED só pode ser escrito pelo backend (service_role), nunca pelo frontend
-- O frontend pode atualizar apenas teamNumber via update limitado ao próprio userId
-- (sorteio roda no frontend e persiste o teamNumber)
create policy "registrations_update_own" on public.match_registrations
  for update using ("userId" = auth.uid());


-- ── 4. EVALUATIONS ───────────────────────────────────────────────────

create table if not exists public.evaluations (
  id            uuid primary key default gen_random_uuid(),
  "matchId"     uuid references public.matches (id) on delete cascade,
  "evaluatorId" uuid references public.users (id),
  "evaluatedId" uuid references public.users (id),
  "scoreGiven"  int check ("scoreGiven" between 1 and 5),
  "createdAt"   timestamptz default now(),
  unique ("matchId", "evaluatorId", "evaluatedId")
);

alter table public.evaluations enable row level security;

-- Cada jogador só vê suas próprias avaliações recebidas/enviadas
create policy "evaluations_select" on public.evaluations
  for select using (
    auth.uid() = "evaluatorId" or auth.uid() = "evaluatedId"
  );

create policy "evaluations_insert_own" on public.evaluations
  for insert with check ("evaluatorId" = auth.uid());
