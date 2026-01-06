-- Senior Projects feature: listings for Harkness Institute students

-- 1) Table
create table if not exists public.senior_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  poster_url text,
  created_at timestamptz not null default now()
);

alter table public.senior_projects enable row level security;

-- Helper predicate: checks if current user belongs to Harkness Institute
create or replace function public.is_harkness_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = uid
      and lower(coalesce(up.institution, '')) = lower('Harkness Institute')
  );
$$;

-- Readable by everyone
drop policy if exists "Senior projects are readable by everyone" on public.senior_projects;
create policy "Senior projects are readable by everyone" on public.senior_projects
  for select using (true);

-- Insert only by Harkness members
drop policy if exists "Harkness members can insert senior projects" on public.senior_projects;
create policy "Harkness members can insert senior projects" on public.senior_projects
  for insert with check (auth.uid() = user_id and public.is_harkness_member(auth.uid()));

-- Update/Delete only by owner and Harkness member
drop policy if exists "Owner can update senior projects" on public.senior_projects;
create policy "Owner can update senior projects" on public.senior_projects
  for update using (auth.uid() = user_id and public.is_harkness_member(auth.uid()));

drop policy if exists "Owner can delete senior projects" on public.senior_projects;
create policy "Owner can delete senior projects" on public.senior_projects
  for delete using (auth.uid() = user_id and public.is_harkness_member(auth.uid()));

-- 2) Signups table
create table if not exists public.senior_project_signups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.senior_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

alter table public.senior_project_signups enable row level security;

-- Signups are readable by everyone
drop policy if exists "Senior project signups are readable by everyone" on public.senior_project_signups;
create policy "Senior project signups are readable by everyone" on public.senior_project_signups
  for select using (true);

-- Users can insert their own signups
drop policy if exists "Users can insert their own signups" on public.senior_project_signups;
create policy "Users can insert their own signups" on public.senior_project_signups
  for insert with check (auth.uid() = user_id);

-- Users can delete their own signups
drop policy if exists "Users can delete their own signups" on public.senior_project_signups;
create policy "Users can delete their own signups" on public.senior_project_signups
  for delete using (auth.uid() = user_id);

-- 3) Storage bucket for posters
-- Create bucket if not exists
do $$ begin
  perform 1 from storage.buckets where id = 'senior-projects-posters';
  if not found then
    perform storage.create_bucket('senior-projects-posters', true, 'public');
  end if;
end $$;

-- Storage policies
-- Allow anyone to read posters
drop policy if exists "Anyone can read senior project posters" on storage.objects;
create policy "Anyone can read senior project posters" on storage.objects
  for select using (bucket_id = 'senior-projects-posters');

-- Allow Harkness members to upload
drop policy if exists "Harkness members can upload posters" on storage.objects;
create policy "Harkness members can upload posters" on storage.objects
  for insert with check (
    bucket_id = 'senior-projects-posters' and public.is_harkness_member(auth.uid())
  );

-- Allow owners to update/delete their own objects
drop policy if exists "Poster owner can update" on storage.objects;
create policy "Poster owner can update" on storage.objects
  for update using (bucket_id = 'senior-projects-posters' and owner = auth.uid());

drop policy if exists "Poster owner can delete" on storage.objects;
create policy "Poster owner can delete" on storage.objects
  for delete using (bucket_id = 'senior-projects-posters' and owner = auth.uid());


