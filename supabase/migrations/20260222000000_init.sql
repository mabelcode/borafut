-- =====================================================================
-- Borafut — MVP Schema v2 (Groups/Bolhas Architecture)
-- Migration: 20260222000000_init.sql
-- Note: All tables are created first, then RLS policies (to avoid
--       forward-reference errors between tables).
-- =====================================================================

-- ── 1. USERS ─────────────────────────────────────────────────────────

create table if not exists public.users (
  id             uuid primary key references auth.users (id) on delete cascade,
  "phoneNumber"  text unique,
  "displayName"  text,
  "mainPosition" text check ("mainPosition" in ('GOALKEEPER', 'DEFENSE', 'ATTACK')),
  "globalScore"  numeric default 3.0,
  "isSuperAdmin" boolean default false,
  "pixKey"       text,
  "createdAt"    timestamptz default now()
);

-- ── 2. GROUPS (BOLHAS) ───────────────────────────────────────────────

create table if not exists public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  "inviteToken"     text unique default replace(gen_random_uuid()::text, '-', ''),
  "inviteExpiresAt" timestamptz,
  "createdAt"       timestamptz default now()
);

-- ── 3. GROUP MEMBERS ─────────────────────────────────────────────────

create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  "groupId"  uuid references public.groups (id) on delete cascade,
  "userId"   uuid references public.users (id) on delete cascade,
  role       text check (role in ('ADMIN', 'PLAYER')) default 'PLAYER',
  "joinedAt" timestamptz default now(),
  unique ("groupId", "userId")
);

-- ── 4. MATCHES ───────────────────────────────────────────────────────

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  "groupId"     uuid references public.groups (id) on delete cascade,
  "managerId"   uuid references public.users (id),
  title         text,
  "scheduledAt" timestamptz,
  "maxPlayers"  int,
  price         numeric,
  status        text default 'OPEN' check (status in ('OPEN', 'CLOSED', 'FINISHED')),
  "createdAt"   timestamptz default now()
);

-- ── 5. MATCH REGISTRATIONS ───────────────────────────────────────────

create table if not exists public.match_registrations (
  id                 uuid primary key default gen_random_uuid(),
  "matchId"          uuid references public.matches (id) on delete cascade,
  "userId"           uuid references public.users (id),
  "snapshotPosition" text,
  "snapshotScore"    numeric,
  status             text default 'RESERVED'
                     check (status in ('RESERVED', 'CONFIRMED', 'WAITLIST')),
  "paymentId"        text,
  "teamNumber"       int,
  "reservedUntil"    timestamptz,
  "createdAt"        timestamptz default now(),
  unique ("matchId", "userId")
);

-- ── 6. EVALUATIONS ───────────────────────────────────────────────────

create table if not exists public.evaluations (
  id            uuid primary key default gen_random_uuid(),
  "matchId"     uuid references public.matches (id) on delete cascade,
  "evaluatorId" uuid references public.users (id),
  "evaluatedId" uuid references public.users (id),
  "scoreGiven"  int check ("scoreGiven" between 1 and 5),
  "createdAt"   timestamptz default now(),
  unique ("matchId", "evaluatorId", "evaluatedId")
);

-- =====================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_registrations enable row level security;
alter table public.evaluations enable row level security;

-- =====================================================================
-- RLS POLICIES
-- All tables created above so forward-references are safe.
-- =====================================================================

-- ── users ─────────────────────────────────────────────────────────────

create policy "users_select_authenticated" on public.users
  for select using (auth.uid() is not null);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ── groups ────────────────────────────────────────────────────────────

create policy "groups_select" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where "groupId" = groups.id and "userId" = auth.uid()
    )
    or exists (
      select 1 from public.users
      where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "groups_insert_superadmin" on public.groups
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true)
  );

create policy "groups_update_admin" on public.groups
  for update using (
    exists (
      select 1 from public.group_members
      where "groupId" = groups.id and "userId" = auth.uid() and role = 'ADMIN'
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

-- ── group_members ─────────────────────────────────────────────────────

create policy "group_members_select" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2."groupId" = group_members."groupId" and gm2."userId" = auth.uid()
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "group_members_insert_self" on public.group_members
  for insert with check (
    "userId" = auth.uid()
    or exists (select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true)
  );

create policy "group_members_update_admin" on public.group_members
  for update using (
    exists (
      select 1 from public.group_members gm2
      where gm2."groupId" = group_members."groupId"
        and gm2."userId" = auth.uid()
        and gm2.role = 'ADMIN'
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

-- ── matches ───────────────────────────────────────────────────────────

create policy "matches_select" on public.matches
  for select using (
    exists (
      select 1 from public.group_members
      where "groupId" = matches."groupId" and "userId" = auth.uid()
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "matches_insert_admin" on public.matches
  for insert with check (
    exists (
      select 1 from public.group_members
      where "groupId" = matches."groupId" and "userId" = auth.uid() and role = 'ADMIN'
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "matches_update_admin" on public.matches
  for update using (
    exists (
      select 1 from public.group_members
      where "groupId" = matches."groupId" and "userId" = auth.uid() and role = 'ADMIN'
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

-- ── match_registrations ───────────────────────────────────────────────

create policy "registrations_select" on public.match_registrations
  for select using (
    exists (
      select 1 from public.matches m
      join public.group_members gm on gm."groupId" = m."groupId"
      where m.id = match_registrations."matchId" and gm."userId" = auth.uid()
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

create policy "registrations_insert_member" on public.match_registrations
  for insert with check (
    "userId" = auth.uid()
    and exists (
      select 1 from public.matches m
      join public.group_members gm on gm."groupId" = m."groupId"
      where m.id = "matchId" and gm."userId" = auth.uid()
    )
  );

create policy "registrations_update" on public.match_registrations
  for update using (
    "userId" = auth.uid()
    or exists (
      select 1 from public.matches m
      join public.group_members gm on gm."groupId" = m."groupId"
      where m.id = match_registrations."matchId"
        and gm."userId" = auth.uid()
        and gm.role = 'ADMIN'
    )
    or exists (
      select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true
    )
  );

-- ── evaluations ───────────────────────────────────────────────────────

create policy "evaluations_select" on public.evaluations
  for select using (
    auth.uid() = "evaluatorId"
    or auth.uid() = "evaluatedId"
    or exists (select 1 from public.users where id = auth.uid() and "isSuperAdmin" = true)
  );

create policy "evaluations_insert_own" on public.evaluations
  for insert with check ("evaluatorId" = auth.uid());
