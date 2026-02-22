-- Allow any authenticated user to read any user's public profile data.
-- This is required for:
--   1) Players to see other players' displayName, mainPosition, globalScore in match listings
--   2) Players to fetch the admin's pixKey to generate the Pix QR Code
--
-- Note: phoneNumber is included because RLS is row-level, not column-level.
-- For MVP this is acceptable; a more granular approach can use a view or Edge Function later.

create policy "users_select_authenticated"
  on public.users for select
  using (auth.uid() is not null);
