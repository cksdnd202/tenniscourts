-- Account-scoped notification inbox for the Courts Korea mobile app.
-- Global announcements are stored once with user_id = null. Booking-open and
-- inquiry-reply items are scoped to one user. Read state is always per user.

begin;

create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  path text not null,
  source_key text not null unique,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint app_notifications_type_check
    check (type in ('booking_open', 'notice', 'inquiry_reply')),
  constraint app_notifications_title_length_check
    check (char_length(btrim(title)) between 1 and 120),
  constraint app_notifications_body_length_check
    check (char_length(btrim(body)) between 1 and 1000),
  constraint app_notifications_path_check
    check (path ~ '^/[a-zA-Z0-9/?&=%._-]+$'),
  constraint app_notifications_expiry_check
    check (expires_at is null or expires_at > occurred_at)
);

comment on table public.app_notifications is
  '앱 알림함에 노출되는 예약 오픈, 공지사항, 고객문의 답변 기록';
comment on column public.app_notifications.user_id is
  'null이면 모든 로그인 사용자에게 노출되는 공통 알림';

create index app_notifications_user_feed_idx
  on public.app_notifications (user_id, occurred_at desc);
create index app_notifications_global_feed_idx
  on public.app_notifications (occurred_at desc)
  where user_id is null;
create index app_notifications_expiry_idx
  on public.app_notifications (expires_at)
  where expires_at is not null;

create table public.app_notification_reads (
  notification_id uuid not null
    references public.app_notifications(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

comment on table public.app_notification_reads is
  '사용자별 앱 알림 읽음 상태';

create index app_notification_reads_user_idx
  on public.app_notification_reads (user_id, read_at desc);

alter table public.app_notifications enable row level security;
alter table public.app_notification_reads enable row level security;

revoke all on table public.app_notifications from anon, authenticated;
revoke all on table public.app_notification_reads from anon, authenticated;

grant select on table public.app_notifications to authenticated;
grant select, insert, update on table public.app_notification_reads to authenticated;
grant all on table public.app_notifications to service_role;
grant all on table public.app_notification_reads to service_role;

create policy "Users can read visible app notifications"
  on public.app_notifications
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy "Users can read their notification read states"
  on public.app_notification_reads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their notification read states"
  on public.app_notification_reads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their notification read states"
  on public.app_notification_reads
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_notice_app_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  notice_id uuid := coalesce(new.id, old.id);
begin
  if tg_op = 'DELETE' then
    delete from public.app_notifications
    where source_key = 'notice:' || old.id::text;
    return old;
  end if;

  if new.status = 'published' and 'app' = any(new.channels) then
    insert into public.app_notifications (
      user_id, type, title, body, path, source_key, source_id,
      occurred_at, expires_at
    ) values (
      null,
      'notice',
      new.title,
      left(new.body, 1000),
      '/notices?noticeId=' || new.id::text,
      'notice:' || new.id::text,
      new.id,
      coalesce(new.published_at, new.created_at),
      coalesce(new.publish_ends_at, coalesce(new.published_at, new.created_at) + interval '90 days')
    )
    on conflict (source_key) do update set
      title = excluded.title,
      body = excluded.body,
      path = excluded.path,
      occurred_at = excluded.occurred_at,
      expires_at = excluded.expires_at;
  else
    delete from public.app_notifications
    where source_key = 'notice:' || notice_id::text;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_notice_app_notification() from public, anon, authenticated;

create trigger sync_notice_app_notification_trigger
after insert or update or delete on public.notices
for each row execute function private.sync_notice_app_notification();

create or replace function private.create_inquiry_reply_app_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  inquiry public.customer_inquiries%rowtype;
begin
  if new.author_type <> 'admin' then
    return new;
  end if;

  select * into inquiry
  from public.customer_inquiries
  where id = new.inquiry_id;

  if inquiry.user_id is null or inquiry.source <> 'app' then
    return new;
  end if;

  insert into public.app_notifications (
    user_id, type, title, body, path, source_key, source_id,
    occurred_at, expires_at
  ) values (
    inquiry.user_id,
    'inquiry_reply',
    '문의하신 내용에 답변이 등록되었어요',
    inquiry.title,
    '/customer-support?inquiryId=' || inquiry.id::text,
    'inquiry_reply:' || new.id::text,
    new.id,
    new.created_at,
    new.created_at + interval '90 days'
  )
  on conflict (source_key) do nothing;

  return new;
end;
$$;

revoke all on function private.create_inquiry_reply_app_notification() from public, anon, authenticated;

create trigger create_inquiry_reply_app_notification_trigger
after insert on public.customer_inquiry_replies
for each row execute function private.create_inquiry_reply_app_notification();

create or replace function private.create_booking_open_app_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  subscription public.notification_subscriptions%rowtype;
  occurrence public.booking_open_occurrences%rowtype;
  booking_rule public.court_booking_rules%rowtype;
  court public.courtinfo%rowtype;
  notification_source_key text;
  notification_title text;
  notification_body text;
  notification_path text;
begin
  if new.status <> 'sent' or (tg_op = 'UPDATE' and old.status = 'sent') then
    return new;
  end if;

  select * into subscription
  from public.notification_subscriptions
  where id = new.subscription_id;
  select * into occurrence
  from public.booking_open_occurrences
  where id = new.occurrence_id;
  select * into booking_rule
  from public.court_booking_rules
  where id = subscription.booking_rule_id;
  select * into court
  from public.courtinfo
  where id = booking_rule.court_id;

  if subscription.id is null or occurrence.id is null or booking_rule.id is null or court.id is null then
    return new;
  end if;

  notification_source_key := 'booking:' || subscription.id::text || ':' || occurrence.id::text;
  notification_title := court.basic_court_name || ' 예약 알림';
  notification_body := case subscription.lead_minutes
    when 10 then '10분 뒤 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
    when 1440 then '내일 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
    else subscription.lead_minutes::text || '분 뒤 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
  end;
  notification_path := '/courts/' || coalesce(court.slug, court.id::text)
    || '?ruleId=' || booking_rule.id::text;

  insert into public.app_notifications (
    user_id, type, title, body, path, source_key, source_id, metadata,
    occurred_at, expires_at
  ) values (
    subscription.user_id,
    'booking_open',
    notification_title,
    notification_body,
    notification_path,
    notification_source_key,
    occurrence.id,
    jsonb_build_object('delivery_ids', jsonb_build_array(new.id::text)),
    coalesce(new.sent_at, now()),
    greatest(occurrence.opens_at + interval '7 days', coalesce(new.sent_at, now()) + interval '1 day')
  )
  on conflict (source_key) do update set
    metadata = jsonb_set(
      public.app_notifications.metadata,
      '{delivery_ids}',
      coalesce(public.app_notifications.metadata->'delivery_ids', '[]'::jsonb)
        || jsonb_build_array(new.id::text),
      true
    );

  return new;
end;
$$;

revoke all on function private.create_booking_open_app_notification() from public, anon, authenticated;

create trigger create_booking_open_app_notification_trigger
after insert or update of status on public.notification_deliveries
for each row execute function private.create_booking_open_app_notification();

-- Backfill existing active app notices, app inquiry replies, and the recent
-- booking pushes that were already accepted before this inbox was introduced.
insert into public.app_notifications (
  user_id, type, title, body, path, source_key, source_id,
  occurred_at, expires_at
)
select
  null,
  'notice',
  notice.title,
  left(notice.body, 1000),
  '/notices?noticeId=' || notice.id::text,
  'notice:' || notice.id::text,
  notice.id,
  coalesce(notice.published_at, notice.created_at),
  coalesce(notice.publish_ends_at, coalesce(notice.published_at, notice.created_at) + interval '90 days')
from public.notices as notice
where notice.status = 'published'
  and 'app' = any(notice.channels)
  and (notice.publish_ends_at is null or notice.publish_ends_at > now())
on conflict (source_key) do nothing;

insert into public.app_notifications (
  user_id, type, title, body, path, source_key, source_id,
  occurred_at, expires_at
)
select
  inquiry.user_id,
  'inquiry_reply',
  '문의하신 내용에 답변이 등록되었어요',
  inquiry.title,
  '/customer-support?inquiryId=' || inquiry.id::text,
  'inquiry_reply:' || reply.id::text,
  reply.id,
  reply.created_at,
  reply.created_at + interval '90 days'
from public.customer_inquiry_replies as reply
join public.customer_inquiries as inquiry on inquiry.id = reply.inquiry_id
where reply.author_type = 'admin'
  and inquiry.source = 'app'
  and inquiry.user_id is not null
  and reply.created_at > now() - interval '90 days'
on conflict (source_key) do nothing;

insert into public.app_notifications (
  user_id, type, title, body, path, source_key, source_id, metadata,
  occurred_at, expires_at
)
select
  subscription.user_id,
  'booking_open',
  court.basic_court_name || ' 예약 알림',
  case subscription.lead_minutes
    when 10 then '10분 뒤 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
    when 1440 then '내일 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
    else subscription.lead_minutes::text || '분 뒤 예약이 열려요. 눌러서 예약 정보를 확인하세요.'
  end,
  '/courts/' || coalesce(court.slug, court.id::text) || '?ruleId=' || booking_rule.id::text,
  'booking:' || subscription.id::text || ':' || occurrence.id::text,
  occurrence.id,
  jsonb_build_object('delivery_ids', jsonb_agg(delivery.id::text)),
  min(coalesce(delivery.sent_at, delivery.updated_at)),
  greatest(occurrence.opens_at + interval '7 days', min(coalesce(delivery.sent_at, delivery.updated_at)) + interval '1 day')
from public.notification_deliveries as delivery
join public.notification_subscriptions as subscription on subscription.id = delivery.subscription_id
join public.booking_open_occurrences as occurrence on occurrence.id = delivery.occurrence_id
join public.court_booking_rules as booking_rule on booking_rule.id = subscription.booking_rule_id
join public.courtinfo as court on court.id = booking_rule.court_id
where delivery.status = 'sent'
  and coalesce(delivery.sent_at, delivery.updated_at) > now() - interval '90 days'
group by subscription.id, occurrence.id, booking_rule.id, court.id
on conflict (source_key) do nothing;

commit;
