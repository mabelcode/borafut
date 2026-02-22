-- Migration: allow admins to confirm any player's registration
-- (MVP manual payment flow — will be removed when webhook auto-confirmation is implemented)

create policy "registrations_update_admin"
  on public.match_registrations for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and "isAdmin" = true
    )
  );
