-- Migration: add pixKey column to users table
alter table public.users
  add column if not exists "pixKey" text;
