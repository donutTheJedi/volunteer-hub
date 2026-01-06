-- Auto-create user_profiles rows when auth.users gets a new user
-- This avoids client-side RLS violations at signup time when no session is yet present

-- Create function that inserts a profile for the new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, full_name, phone, institution, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'institution', ''),
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  -- Check if this user's email matches any pending organization owners
  -- and update those organizations to use the real user ID
  update public.organizations 
  set owner = new.id, pending_owner_email = null
  where pending_owner_email = new.email
    and owner != new.id;

  return new;
end;
$$;

-- Create trigger on auth.users for inserts
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


