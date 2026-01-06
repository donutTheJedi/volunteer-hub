-- Add created_at column to signups table for daily digest filtering

-- Add created_at column with default value of now()
alter table public.signups 
  add column if not exists created_at timestamptz not null default now();

-- Add index on created_at for efficient date filtering
create index if not exists signups_created_at_idx on public.signups(created_at);

-- Add index on opportunity_id + created_at for efficient filtered queries
create index if not exists signups_opportunity_created_idx on public.signups(opportunity_id, created_at);

