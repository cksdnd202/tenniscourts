set local lock_timeout = '5s';

alter table public.courtinfo
  add column if not exists instagram_hashtag text;

comment on column public.courtinfo.instagram_hashtag is
  'Instagram search hashtag without the leading #. Current values are normalized venue-level tags; admins may override them.';

with raw as (
  select
    id,
    sport_type,
    basic_court_name,
    case
      when sport_type = 'tennis'
       and basic_court_name ~ '^[[:space:]]*[0-9]+[[:space:]]*-[[:space:]]*테니스장'
       and basic_court_name like '%대월면 체육공원%'
        then '대월면 체육공원 테니스장'
      else basic_court_name
    end as source_name
  from public.courtinfo
  where instagram_hashtag is null or btrim(instagram_hashtag) = ''
),
without_schedule_groups as (
  select
    id,
    sport_type,
    basic_court_name,
    regexp_replace(
      regexp_replace(
        regexp_replace(source_name, '\((평일|주말|공휴일|휴일|토|일|토/일)\)', '', 'g'),
        '\([^)]*(주말|공휴일|평일|휴일|요일|토/일)[^)]*\)',
        '',
        'g'
      ),
      '\[[^]]*(주말|공휴일|평일|휴일|요일|토/일)[^]]*\]',
      '',
      'g'
    ) as name_without_schedule_groups
  from raw
),
venue_names as (
  select
    id,
    sport_type,
    basic_court_name,
    case
      when sport_type = 'tennis' and position('테니스장' in name_without_schedule_groups) > 0
        then substring(name_without_schedule_groups from '^(.*테니스장)')
      when sport_type = 'badminton' and position('배드민턴장' in name_without_schedule_groups) > 0
        then substring(name_without_schedule_groups from '^(.*배드민턴장)')
      else name_without_schedule_groups
    end as venue_name
  from without_schedule_groups
),
normalized as (
  select
    id,
    sport_type,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          venue_name,
          '(실내|실외|야외|주말|공휴일|평일|휴일)',
          '',
          'g'
        ),
        '제?[0-9]+([[:space:]]*~[[:space:]]*[0-9]+)?[[:space:]]*번[[:space:]]*코트',
        '',
        'g'
      ),
      '[^0-9A-Za-z가-힣_]',
      '',
      'g'
    ) as cleaned
  from venue_names
),
candidates as (
  select
    id,
    case
      when sport_type = 'tennis' and right(cleaned, 4) <> '테니스장'
        then cleaned || '테니스장'
      when sport_type = 'badminton' and right(cleaned, 5) <> '배드민턴장'
        then regexp_replace(cleaned, '(배드민턴코트|배드민턴)$', '') || '배드민턴장'
      else cleaned
    end as hashtag
  from normalized
)
update public.courtinfo as court
set instagram_hashtag = candidates.hashtag
from candidates
where court.id = candidates.id
  and candidates.hashtag <> '';
