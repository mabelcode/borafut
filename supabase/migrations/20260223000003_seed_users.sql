-- =====================================================================
-- Borafut — Seed Test Users (Fixed Position Values)
-- Migration: 20260223000003_seed_users.sql
-- =====================================================================

-- This migration uses the "INSERT ... SELECT ... WHERE NOT EXISTS" pattern.
-- All mainPosition values are corrected to match the check constraint:
-- ('GOALKEEPER', 'DEFENSE', 'ATTACK')

-- User 1: Gabriel
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000001', 'gabriel.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gabriel.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000001', 'Gabriel Silva', '11999990001', 'ATTACK', 3.5, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001');

-- User 2: Lucas
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000002', 'lucas.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lucas.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000002', 'Lucas Oliveira', '11999990002', 'ATTACK', 4.2, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000002');

-- User 3: Pedro
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000003', 'pedro.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'pedro.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000003', 'Pedro Santos', '11999990003', 'DEFENSE', 2.8, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003');

-- User 4: Bruno
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000004', 'bruno.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'bruno.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000004', 'Bruno Costa', '11999990004', 'GOALKEEPER', 3.0, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000004');

-- User 5: Rafael
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000005', 'rafael.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rafael.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000005', 'Rafael Souza', '11999990005', 'ATTACK', 4.5, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000005');

-- User 6: Thiago
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000006', 'thiago.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'thiago.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000006', 'Thiago Lima', '11999990006', 'ATTACK', 3.8, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000006');

-- User 7: Matheus
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000007', 'matheus.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'matheus.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000007', 'Matheus Ferreira', '11999990007', 'DEFENSE', 3.2, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000007');

-- User 8: Vinícius
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000008', 'vinicius.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vinicius.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000008', 'Vinícius Rocha', '11999990008', 'ATTACK', 4.0, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000008');

-- User 9: André
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000009', 'andre.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'andre.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000009', 'André Almeida', '11999990009', 'DEFENSE', 2.5, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000009');

-- User 10: Felipe
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
SELECT '00000000-0000-0000-0000-000000000010', 'felipe.test@example.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), now(), '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'felipe.test@example.com');

INSERT INTO public.users (id, "displayName", "phoneNumber", "mainPosition", "globalScore", "isSuperAdmin")
SELECT '00000000-0000-0000-0000-000000000010', 'Felipe Barbosa', '11999990010', 'DEFENSE', 3.6, false
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000010');
