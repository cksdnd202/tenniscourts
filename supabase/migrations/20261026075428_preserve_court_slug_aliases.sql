begin;

create table public.court_slug_aliases (
  slug text primary key,
  court_id uuid not null references public.courtinfo(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint court_slug_aliases_slug_not_blank_check
    check (char_length(btrim(slug)) > 0)
);

comment on table public.court_slug_aliases is
  '시설 slug 변경 후에도 기존 상세페이지 URL을 새 canonical URL로 연결하기 위한 별칭';

create index court_slug_aliases_court_id_idx
  on public.court_slug_aliases (court_id);

alter table public.court_slug_aliases enable row level security;

revoke all on table public.court_slug_aliases from anon, authenticated;
grant all on table public.court_slug_aliases to service_role;

create or replace function public.preserve_court_slug_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.slug is distinct from new.slug
    and old.slug is not null
    and btrim(old.slug) <> '' then
    insert into public.court_slug_aliases (slug, court_id)
    values (old.slug, old.id)
    on conflict (slug) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.preserve_court_slug_alias() from public;
grant execute on function public.preserve_court_slug_alias() to service_role;

create trigger preserve_court_slug_alias_before_update
before update of slug on public.courtinfo
for each row
execute function public.preserve_court_slug_alias();

commit;
