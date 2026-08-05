-- Migration: create table areas
-- Note: this uses gen_random_uuid(); if your Postgres doesn't have pgcrypto, enable it or replace with uuid_generate_v4().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_name_key UNIQUE (name)
);
