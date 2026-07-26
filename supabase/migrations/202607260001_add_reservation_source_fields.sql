alter table public.courtinfo
  add column if not exists source_provider text,
  add column if not exists source_service_id text,
  add column if not exists source_service_name text,
  add column if not exists source_place_name text,
  add column if not exists source_area_name text,
  add column if not exists source_time_min text,
  add column if not exists source_time_max text,
  add column if not exists source_match_key text,
  add column if not exists source_synced_at timestamptz;

create index if not exists courtinfo_source_match_key_idx
  on public.courtinfo (source_match_key);

create index if not exists courtinfo_source_provider_idx
  on public.courtinfo (source_provider);
