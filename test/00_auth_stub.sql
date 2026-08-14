-- LOCAL TEST ONLY. Supabase provides these for real. Do not deploy.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- test harness swaps identity via  set app.uid = '<uuid>'
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.uid', true), '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant select on tables to authenticated;
