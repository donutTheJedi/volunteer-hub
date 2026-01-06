-- Create institutions lookup table for user_profiles.institution with typeahead support

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

-- Ensure case-insensitive uniqueness on name
create unique index if not exists institutions_name_unique on public.institutions (lower(name));

alter table public.institutions enable row level security;

-- Anyone can read institutions
create policy if not exists "Institutions are readable by everyone" on public.institutions
  for select using (true);

-- Only authenticated users can insert
create policy if not exists "Authenticated users can insert institutions" on public.institutions
  for insert with check (auth.uid() is not null);

-- Only creator can update/delete (conservative; currently we won't expose these ops)
create policy if not exists "Creator can update institutions" on public.institutions
  for update using (created_by = auth.uid());

create policy if not exists "Creator can delete institutions" on public.institutions
  for delete using (created_by = auth.uid());


