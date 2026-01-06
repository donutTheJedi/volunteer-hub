-- Change default language from English to Spanish

-- Update the default value for the language column
ALTER TABLE user_profiles ALTER COLUMN language SET DEFAULT 'es';

-- Update existing users with 'en' to 'es' (optional - comment out if you want to keep existing preferences)
-- UPDATE user_profiles SET language = 'es' WHERE language = 'en';

-- Update the trigger function to set Spanish as default language for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, full_name, phone, institution, language, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'institution', ''),
    coalesce(new.raw_user_meta_data->>'language', 'es'),
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

