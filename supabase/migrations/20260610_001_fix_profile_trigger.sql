-- Fix profile auto-creation trigger.
-- The trigger must:
-- 1. Run as the postgres role (not the authenticated user)
-- 2. Handle the case where raw_user_meta_data may be null
-- 3. Grant necessary permissions

-- Drop and recreate with explicit schema and error handling
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
exception
  when others then
    -- Log but don't block signup if profile creation fails
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Ensure the trigger exists (recreate if needed)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant the function owner (postgres) insert access on profiles
-- This is needed because RLS is enabled
grant insert on public.profiles to postgres;
grant usage on schema public to postgres;
