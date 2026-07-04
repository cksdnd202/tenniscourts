alter table public.courtinfo
  add column if not exists basic_latitude double precision,
  add column if not exists basic_longitude double precision;
