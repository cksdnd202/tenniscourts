begin;

alter table public.notices
  add column push_requested_at timestamptz,
  add column push_started_at timestamptz,
  add column push_sent_at timestamptz,
  add column push_error text;

comment on column public.notices.push_requested_at is
  '관리자가 앱 공지 푸시 발송을 요청한 시각';
comment on column public.notices.push_started_at is
  '중복 발송을 막기 위해 발송 작업이 공지를 선점한 시각';
comment on column public.notices.push_sent_at is
  '공지 푸시 발송 처리가 완료된 시각';
comment on column public.notices.push_error is
  '자동 재발송으로 인한 중복을 막기 위해 수동 확인이 필요한 발송 오류';

create index notices_pending_push_idx
  on public.notices (published_at, push_requested_at)
  where status = 'published'
    and push_requested_at is not null
    and push_sent_at is null
    and push_error is null;

commit;
