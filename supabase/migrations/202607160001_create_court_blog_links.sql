create table if not exists public.court_blog_links (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courtinfo(id) on delete cascade,
  url text not null,
  title text,
  description text,
  thumbnail_url text,
  source text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists court_blog_links_court_sort_idx
  on public.court_blog_links (court_id, sort_order asc);

alter table public.court_blog_links enable row level security;

drop policy if exists "Anyone can read court blog links" on public.court_blog_links;

create policy "Anyone can read court blog links"
  on public.court_blog_links
  for select
  using (true);
