create table if not exists public.favorite_courts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id uuid not null references public.courtinfo(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, court_id)
);

create index if not exists favorite_courts_user_created_at_idx
  on public.favorite_courts (user_id, created_at desc);

alter table public.favorite_courts enable row level security;

drop policy if exists "Users can read their own favorite courts" on public.favorite_courts;
drop policy if exists "Users can insert their own favorite courts" on public.favorite_courts;
drop policy if exists "Users can delete their own favorite courts" on public.favorite_courts;

create policy "Users can read their own favorite courts"
  on public.favorite_courts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorite courts"
  on public.favorite_courts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorite courts"
  on public.favorite_courts
  for delete
  using (auth.uid() = user_id);
