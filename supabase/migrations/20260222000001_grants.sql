-- Grant table-level access to the `authenticated` role.
-- When tables are created via migration (not the Supabase Dashboard), Supabase does NOT
-- automatically add these grants. Without them, PostgreSQL returns "permission denied"
-- before RLS policies are even evaluated.

grant select, insert, update, delete on table public.users             to authenticated;
grant select, insert, update, delete on table public.groups            to authenticated;
grant select, insert, update, delete on table public.group_members     to authenticated;
grant select, insert, update, delete on table public.matches           to authenticated;
grant select, insert, update, delete on table public.match_registrations to authenticated;
grant select, insert, update, delete on table public.evaluations       to authenticated;
