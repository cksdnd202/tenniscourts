-- 운영 예약 데이터와 분리된 자동 발송 전체 흐름 테스트 큐.
-- 앱 사용자가 직접 접근하지 않고 서버(service_role)만 관리한다.

create table public.notification_scheduled_test_jobs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.notification_subscriptions(id) on delete cascade,
  device_push_token_id uuid not null
    references public.device_push_tokens(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  provider_ticket_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_scheduled_test_jobs_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  constraint notification_scheduled_test_jobs_attempt_count_check
    check (attempt_count >= 0),
  constraint notification_scheduled_test_jobs_unique_delivery
    unique (subscription_id, device_push_token_id, scheduled_for)
);

comment on table public.notification_scheduled_test_jobs is
  '운영 예약 오픈 데이터와 분리된 일회성 자동 푸시 전체 흐름 테스트 큐';

create index notification_scheduled_test_jobs_due_idx
  on public.notification_scheduled_test_jobs (scheduled_for, status)
  where status = 'pending';

alter table public.notification_scheduled_test_jobs enable row level security;

revoke all on table public.notification_scheduled_test_jobs from anon, authenticated;
grant all on table public.notification_scheduled_test_jobs to service_role;
