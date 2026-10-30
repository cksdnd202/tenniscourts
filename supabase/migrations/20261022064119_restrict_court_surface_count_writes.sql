revoke insert, update, delete, truncate, references, trigger
  on table public.court_surface_counts
  from anon, authenticated;

grant select on table public.court_surface_counts to anon, authenticated;
