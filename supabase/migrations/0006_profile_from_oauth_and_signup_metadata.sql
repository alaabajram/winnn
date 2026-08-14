-- Populate the profile from whatever the sign-up method provides.
-- Email sign-up sends full_name / mobile in raw_user_meta_data.
-- Google returns 'name' and 'picture'. Handle all shapes so the profile is
-- never blank - a blank full_name means a winner shows up as an email
-- address on the public results page.

create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text; v_mobile text; v_avatar text;
begin
  v_name := nullif(trim(coalesce(
    v_meta->>'full_name', v_meta->>'name',
    concat_ws(' ', v_meta->>'given_name', v_meta->>'family_name')
  )), '');
  v_mobile := nullif(trim(coalesce(v_meta->>'mobile', v_meta->>'phone', new.phone)), '');
  v_avatar := nullif(trim(coalesce(v_meta->>'avatar_url', v_meta->>'picture')), '');

  insert into profiles(id, email, mobile, full_name, avatar_url)
  values (new.id, new.email, v_mobile, v_name, v_avatar)
  on conflict (id) do update
    set email      = coalesce(excluded.email, profiles.email),
        full_name  = coalesce(profiles.full_name, excluded.full_name),
        mobile     = coalesce(profiles.mobile, excluded.mobile),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url);

  insert into wallets(customer_id) values (new.id) on conflict (customer_id) do nothing;
  return new;
end $$;

create or replace function fn_handle_user_updated() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  update profiles
     set email      = coalesce(new.email, email),
         full_name  = coalesce(full_name, nullif(trim(coalesce(
                        v_meta->>'full_name', v_meta->>'name')), '')),
         avatar_url = coalesce(avatar_url, nullif(trim(coalesce(
                        v_meta->>'avatar_url', v_meta->>'picture')), '')),
         updated_at = now()
   where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function fn_handle_user_updated();

revoke all on function fn_handle_user_updated() from public, anon, authenticated;
