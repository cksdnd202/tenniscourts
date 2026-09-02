create table if not exists public.court_booking_rule_fees (
  id uuid primary key default gen_random_uuid(),
  booking_rule_id uuid not null unique
    references public.court_booking_rules(id) on delete cascade,
  weekday_price integer,
  weekend_price integer,
  lighting_fee_separate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_booking_rule_fees_weekday_price_check
    check (weekday_price is null or weekday_price >= 0),
  constraint court_booking_rule_fees_weekend_price_check
    check (weekend_price is null or weekend_price >= 0),
  constraint court_booking_rule_fees_has_price_check
    check (weekday_price is not null or weekend_price is not null)
);

comment on table public.court_booking_rule_fees is
  '예약 규칙별 평일/주말 이용요금과 조명비 별도 여부';
comment on column public.court_booking_rule_fees.weekday_price is '평일 이용요금(원)';
comment on column public.court_booking_rule_fees.weekend_price is '주말 및 공휴일 이용요금(원)';
comment on column public.court_booking_rule_fees.lighting_fee_separate is '조명비 별도 부과 여부';

alter table public.court_booking_rule_fees enable row level security;

grant select on table public.court_booking_rule_fees to anon, authenticated;
revoke insert, update, delete on table public.court_booking_rule_fees from anon, authenticated;

drop policy if exists "Anyone can read court booking rule fees"
  on public.court_booking_rule_fees;

create policy "Anyone can read court booking rule fees"
  on public.court_booking_rule_fees
  for select
  to anon, authenticated
  using (true);
