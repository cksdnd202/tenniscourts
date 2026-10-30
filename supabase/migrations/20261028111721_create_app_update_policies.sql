create table if not exists public.app_update_policies (
  platform text primary key check (platform in ('android', 'ios')),
  enabled boolean not null default false,
  update_mode text not null default 'none' check (update_mode in ('none', 'recommend', 'force')),
  latest_version_name text not null,
  latest_build_number integer not null check (latest_build_number >= 1),
  minimum_build_number integer not null check (minimum_build_number >= 1),
  title text not null,
  message text not null,
  store_url text not null,
  remind_after_hours integer not null default 24 check (remind_after_hours between 1 and 720),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint app_update_policies_build_range_check
    check (minimum_build_number <= latest_build_number)
);

comment on table public.app_update_policies is
  'Admin-managed mobile update policy. Read by the server only and exposed to apps through a sanitized public API.';

alter table public.app_update_policies enable row level security;

revoke all on table public.app_update_policies from public, anon, authenticated;
grant select, insert, update, delete on table public.app_update_policies to service_role;

insert into public.app_update_policies (
  platform,
  enabled,
  update_mode,
  latest_version_name,
  latest_build_number,
  minimum_build_number,
  title,
  message,
  store_url,
  remind_after_hours
)
values (
  'android',
  false,
  'none',
  '1.0.0',
  32,
  32,
  '새로운 버전이 출시되었어요',
  '더 안정적인 서비스 이용을 위해 최신 버전으로 업데이트해 주세요.',
  'https://play.google.com/store/apps/details?id=com.courtskorea.app',
  24
)
on conflict (platform) do nothing;
