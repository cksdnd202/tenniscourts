-- Versioned legal consent history for the native Courts Korea app.
-- A new row is written whenever either required document version changes.

begin;

create table public.user_legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_consent_version text not null,
  agreed_at timestamptz not null default now(),
  platform text not null,
  created_at timestamptz not null default now(),
  constraint user_legal_consents_platform_check
    check (platform in ('ios', 'android', 'web')),
  constraint user_legal_consents_version_check
    check (
      char_length(btrim(terms_version)) between 1 and 50
      and char_length(btrim(privacy_consent_version)) between 1 and 50
    ),
  constraint user_legal_consents_version_unique
    unique (user_id, terms_version, privacy_consent_version)
);

comment on table public.user_legal_consents is
  '사용자별 필수 이용약관 및 개인정보 수집·이용 동의 이력';

create index user_legal_consents_user_agreed_idx
  on public.user_legal_consents (user_id, agreed_at desc);

alter table public.user_legal_consents enable row level security;

revoke all on table public.user_legal_consents from anon, authenticated;
grant select, insert, update on table public.user_legal_consents to authenticated;
grant all on table public.user_legal_consents to service_role;

create policy "Users can read their own legal consents"
  on public.user_legal_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own legal consents"
  on public.user_legal_consents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own legal consents"
  on public.user_legal_consents
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
