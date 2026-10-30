-- Courts Korea 예약 오픈 푸시 알림 기반 스키마
--
-- 사용자 앱에서 직접 관리하는 데이터:
--   notification_subscriptions, device_push_tokens
-- 서버의 예약 계산기/발송기만 관리하는 데이터:
--   booking_open_occurrences, notification_deliveries

create table public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_rule_id uuid not null
    references public.court_booking_rules(id) on delete cascade,
  lead_minutes integer not null default 10,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_subscriptions_lead_minutes_check
    check (lead_minutes between 0 and 10080),
  constraint notification_subscriptions_unique_reminder
    unique (user_id, booking_rule_id, lead_minutes)
);

comment on table public.notification_subscriptions is
  '사용자별 예약 규칙 푸시 알림 구독';
comment on column public.notification_subscriptions.lead_minutes is
  '예약 오픈 몇 분 전에 알림을 보낼지 지정. 0은 오픈 시각';

create index notification_subscriptions_user_enabled_idx
  on public.notification_subscriptions (user_id, is_enabled)
  where is_enabled = true;

create index notification_subscriptions_rule_enabled_idx
  on public.notification_subscriptions (booking_rule_id, is_enabled)
  where is_enabled = true;

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null,
  device_id text,
  app_version text,
  is_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_platform_check
    check (platform in ('ios', 'android', 'web')),
  constraint device_push_tokens_enabled_state_check
    check (
      (is_enabled = true and disabled_at is null)
      or (is_enabled = false)
    )
);

comment on table public.device_push_tokens is
  '로그인 사용자에게 연결된 Expo 푸시 토큰';
comment on column public.device_push_tokens.device_id is
  '앱 설치 단위를 구분하기 위한 클라이언트 생성 식별자';

create index device_push_tokens_user_enabled_idx
  on public.device_push_tokens (user_id, is_enabled)
  where is_enabled = true;

create table public.booking_open_occurrences (
  id uuid primary key default gen_random_uuid(),
  booking_rule_id uuid not null
    references public.court_booking_rules(id) on delete cascade,
  opens_at timestamptz not null,
  status text not null default 'scheduled',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_open_occurrences_status_check
    check (status in ('scheduled', 'cancelled')),
  constraint booking_open_occurrences_cancelled_state_check
    check (
      (status = 'scheduled' and cancelled_at is null)
      or (status = 'cancelled' and cancelled_at is not null)
    ),
  constraint booking_open_occurrences_unique_open
    unique (booking_rule_id, opens_at)
);

comment on table public.booking_open_occurrences is
  '예약 규칙으로부터 서버가 계산한 실제 예약 오픈 시각';

create index booking_open_occurrences_scheduled_at_idx
  on public.booking_open_occurrences (opens_at)
  where status = 'scheduled';

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.notification_subscriptions(id) on delete cascade,
  occurrence_id uuid not null
    references public.booking_open_occurrences(id) on delete cascade,
  device_push_token_id uuid
    references public.device_push_tokens(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  provider_ticket_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  constraint notification_deliveries_attempt_count_check
    check (attempt_count >= 0),
  constraint notification_deliveries_unique_device_delivery
    unique (subscription_id, occurrence_id, device_push_token_id)
);

comment on table public.notification_deliveries is
  '기기별 푸시 알림 발송 예정 및 처리 결과';

create index notification_deliveries_due_idx
  on public.notification_deliveries (scheduled_for, status)
  where status in ('pending', 'failed');

create index notification_deliveries_subscription_created_idx
  on public.notification_deliveries (subscription_id, created_at desc);

alter table public.notification_subscriptions enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.booking_open_occurrences enable row level security;
alter table public.notification_deliveries enable row level security;

revoke all on table public.notification_subscriptions from anon;
revoke all on table public.device_push_tokens from anon;
revoke all on table public.booking_open_occurrences from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;

grant select, insert, update, delete
  on table public.notification_subscriptions to authenticated;
grant select, insert, update, delete
  on table public.device_push_tokens to authenticated;
grant select on table public.notification_deliveries to authenticated;

grant all on table public.notification_subscriptions to service_role;
grant all on table public.device_push_tokens to service_role;
grant all on table public.booking_open_occurrences to service_role;
grant all on table public.notification_deliveries to service_role;

create policy "Users can read their own notification subscriptions"
  on public.notification_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own notification subscriptions"
  on public.notification_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own notification subscriptions"
  on public.notification_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own notification subscriptions"
  on public.notification_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own push tokens"
  on public.device_push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own push tokens"
  on public.device_push_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own push tokens"
  on public.device_push_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own push tokens"
  on public.device_push_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own notification deliveries"
  on public.notification_deliveries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.notification_subscriptions as subscription
      where subscription.id = notification_deliveries.subscription_id
        and subscription.user_id = (select auth.uid())
    )
  );
