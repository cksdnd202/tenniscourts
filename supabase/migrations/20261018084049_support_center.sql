-- Courts Korea notices and customer support center.
-- Public clients can only read currently published notices. Signed-in users
-- can create app inquiries and can only read their own inquiries and replies.
-- All administrative writes are performed by server-only service role routes.

begin;

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  channels text[] not null default array['app', 'web']::text[],
  status text not null default 'draft',
  is_pinned boolean not null default false,
  published_at timestamptz,
  publish_ends_at timestamptz,
  action_label text,
  action_url text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint notices_body_length_check check (char_length(btrim(body)) between 1 and 20000),
  constraint notices_channels_check check (
    cardinality(channels) > 0
    and channels <@ array['app', 'web']::text[]
  ),
  constraint notices_status_check check (status in ('draft', 'published', 'archived')),
  constraint notices_publish_window_check check (
    publish_ends_at is null or published_at is null or publish_ends_at > published_at
  )
);

comment on table public.notices is '앱과 웹에 채널별로 노출하는 Courts Korea 공지사항';
comment on column public.notices.channels is '노출 채널. app, web 또는 둘 다';

create index notices_public_feed_idx
  on public.notices (is_pinned desc, published_at desc, created_at desc)
  where status = 'published';

create table public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null,
  category text not null default 'other',
  title text not null,
  body text not null,
  contact_name text,
  contact_email text not null,
  status text not null default 'new',
  app_version text,
  os_name text,
  device_model text,
  page_url text,
  user_agent text,
  last_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_inquiries_source_check check (source in ('app', 'web')),
  constraint customer_inquiries_category_check check (
    category in ('service', 'court_info', 'notification', 'account', 'bug', 'other')
  ),
  constraint customer_inquiries_status_check check (
    status in ('new', 'in_progress', 'answered', 'closed')
  ),
  constraint customer_inquiries_title_length_check check (
    char_length(btrim(title)) between 1 and 120
  ),
  constraint customer_inquiries_body_length_check check (
    char_length(btrim(body)) between 1 and 10000
  ),
  constraint customer_inquiries_email_length_check check (
    char_length(btrim(contact_email)) between 3 and 320
  )
);

comment on table public.customer_inquiries is '앱·웹에서 접수된 고객문의';
comment on column public.customer_inquiries.source is '서버 또는 앱이 기록한 접수 채널';

create index customer_inquiries_status_created_idx
  on public.customer_inquiries (status, created_at desc);
create index customer_inquiries_source_created_idx
  on public.customer_inquiries (source, created_at desc);
create index customer_inquiries_user_created_idx
  on public.customer_inquiries (user_id, created_at desc)
  where user_id is not null;

create table public.customer_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.customer_inquiries(id) on delete cascade,
  body text not null,
  author_type text not null default 'admin',
  author_label text,
  created_at timestamptz not null default now(),
  constraint customer_inquiry_replies_body_length_check check (
    char_length(btrim(body)) between 1 and 10000
  ),
  constraint customer_inquiry_replies_author_type_check check (
    author_type in ('admin', 'customer')
  )
);

comment on table public.customer_inquiry_replies is '고객문의 답변 대화 기록';

create index customer_inquiry_replies_inquiry_created_idx
  on public.customer_inquiry_replies (inquiry_id, created_at asc);

alter table public.notices enable row level security;
alter table public.customer_inquiries enable row level security;
alter table public.customer_inquiry_replies enable row level security;

revoke all on table public.notices from anon, authenticated;
revoke all on table public.customer_inquiries from anon, authenticated;
revoke all on table public.customer_inquiry_replies from anon, authenticated;

grant select on table public.notices to anon, authenticated;
grant select, insert on table public.customer_inquiries to authenticated;
grant select on table public.customer_inquiry_replies to authenticated;

grant all on table public.notices to service_role;
grant all on table public.customer_inquiries to service_role;
grant all on table public.customer_inquiry_replies to service_role;

create policy "Published notices are publicly readable"
  on public.notices
  for select
  to anon, authenticated
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
    and (publish_ends_at is null or publish_ends_at > now())
  );

create policy "Users can create their own app inquiries"
  on public.customer_inquiries
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and source = 'app'
    and status = 'new'
  );

create policy "Users can read their own inquiries"
  on public.customer_inquiries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read replies to their own inquiries"
  on public.customer_inquiry_replies
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customer_inquiries as inquiry
      where inquiry.id = customer_inquiry_replies.inquiry_id
        and inquiry.user_id = (select auth.uid())
    )
  );

commit;
