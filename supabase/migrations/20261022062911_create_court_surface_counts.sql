create table if not exists public.court_surface_counts (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courtinfo(id) on delete cascade,
  surface_type text not null,
  indoor_count integer not null default 0,
  outdoor_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_surface_counts_surface_type_check
    check (surface_type in ('hard', 'grass', 'clay', 'wood', 'urethane', 'synthetic', 'other')),
  constraint court_surface_counts_indoor_count_check check (indoor_count >= 0),
  constraint court_surface_counts_outdoor_count_check check (outdoor_count >= 0),
  constraint court_surface_counts_court_surface_key unique (court_id, surface_type)
);

create index if not exists court_surface_counts_court_id_idx
  on public.court_surface_counts (court_id);

alter table public.court_surface_counts enable row level security;

grant select on table public.court_surface_counts to anon, authenticated;

create policy "Public can read court surface counts"
  on public.court_surface_counts
  for select
  to anon, authenticated
  using (true);
