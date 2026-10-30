begin;

create table public.court_information_reports (
  id uuid primary key default gen_random_uuid(),
  court_id uuid references public.courtinfo(id) on delete set null,
  court_name text not null,
  sport_type text not null,
  category text not null,
  content text not null,
  status text not null default 'new',
  source text not null default 'web',
  page_url text,
  user_agent text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_information_reports_court_name_length_check
    check (char_length(btrim(court_name)) between 1 and 200),
  constraint court_information_reports_sport_type_check
    check (sport_type in ('tennis', 'badminton')),
  constraint court_information_reports_category_check
    check (category in ('booking_open', 'location', 'pricing', 'court_type', 'amenities')),
  constraint court_information_reports_content_length_check
    check (char_length(btrim(content)) between 1 and 5000),
  constraint court_information_reports_status_check
    check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  constraint court_information_reports_source_check
    check (source in ('web', 'app'))
);

comment on table public.court_information_reports is
  '상세페이지에서 사용자가 제보한 시설 정보 수정 요청';
comment on column public.court_information_reports.court_name is
  '제보 접수 시점의 시설명 스냅샷';
comment on column public.court_information_reports.category is
  '예약 오픈, 위치, 이용요금, 코트/바닥 종류, 편의시설 중 제보 대상';

create index court_information_reports_status_created_idx
  on public.court_information_reports (status, created_at desc);
create index court_information_reports_court_created_idx
  on public.court_information_reports (court_id, created_at desc)
  where court_id is not null;

alter table public.court_information_reports enable row level security;

revoke all on table public.court_information_reports from anon, authenticated;
grant all on table public.court_information_reports to service_role;

update public.court_amenities
set checked_at = '2026-10-26 00:00:00+09'::timestamptz;

commit;
