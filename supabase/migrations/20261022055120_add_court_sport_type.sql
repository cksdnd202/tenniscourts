alter table public.courtinfo
  add column if not exists sport_type text;

update public.courtinfo
set sport_type = 'tennis'
where sport_type is null;

alter table public.courtinfo
  alter column sport_type set default 'tennis',
  alter column sport_type set not null;

alter table public.courtinfo
  drop constraint if exists courtinfo_sport_type_check;

alter table public.courtinfo
  add constraint courtinfo_sport_type_check
  check (sport_type in ('tennis', 'badminton'));

comment on column public.courtinfo.sport_type is
  'Facility sport discriminator: tennis or badminton';

create index if not exists courtinfo_sport_type_use_or_not_idx
  on public.courtinfo (sport_type, use_or_not);
