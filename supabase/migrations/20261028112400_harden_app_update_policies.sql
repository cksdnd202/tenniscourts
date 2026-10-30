create policy "App update policies are server only"
on public.app_update_policies
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists app_update_policies_updated_by_idx
  on public.app_update_policies (updated_by)
  where updated_by is not null;
