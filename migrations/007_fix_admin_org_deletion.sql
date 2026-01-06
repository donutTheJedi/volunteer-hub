-- Fix admin organization deletion by allowing service role to delete organizations

-- Drop the existing delete policy
drop policy if exists "Enable delete for users based on user_id" on public.organizations;

-- Create new delete policy that allows both owners and service role (admins) to delete
create policy "Enable delete for owners and service role" on public.organizations
  for delete using (
    (auth.uid() = owner) OR 
    (auth.role() = 'service_role')
  );
