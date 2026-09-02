alter table public.court_booking_rule_fees
  add column if not exists is_free boolean not null default false,
  add column if not exists price_basis_hours smallint not null default 1,
  add column if not exists outdoor_weekday_price integer,
  add column if not exists outdoor_weekend_price integer,
  add column if not exists indoor_weekday_price integer,
  add column if not exists indoor_weekend_price integer;

alter table public.court_booking_rule_fees
  drop constraint if exists court_booking_rule_fees_has_price_check,
  drop constraint if exists court_booking_rule_fees_price_basis_hours_check,
  drop constraint if exists court_booking_rule_fees_outdoor_weekday_price_check,
  drop constraint if exists court_booking_rule_fees_outdoor_weekend_price_check,
  drop constraint if exists court_booking_rule_fees_indoor_weekday_price_check,
  drop constraint if exists court_booking_rule_fees_indoor_weekend_price_check,
  drop constraint if exists court_booking_rule_fees_free_price_check;

alter table public.court_booking_rule_fees
  add constraint court_booking_rule_fees_price_basis_hours_check
    check (price_basis_hours in (1, 2, 3)),
  add constraint court_booking_rule_fees_outdoor_weekday_price_check
    check (outdoor_weekday_price is null or outdoor_weekday_price >= 0),
  add constraint court_booking_rule_fees_outdoor_weekend_price_check
    check (outdoor_weekend_price is null or outdoor_weekend_price >= 0),
  add constraint court_booking_rule_fees_indoor_weekday_price_check
    check (indoor_weekday_price is null or indoor_weekday_price >= 0),
  add constraint court_booking_rule_fees_indoor_weekend_price_check
    check (indoor_weekend_price is null or indoor_weekend_price >= 0),
  add constraint court_booking_rule_fees_free_price_check
    check (
      (
        is_free
        and weekday_price is null
        and weekend_price is null
        and outdoor_weekday_price is null
        and outdoor_weekend_price is null
        and indoor_weekday_price is null
        and indoor_weekend_price is null
      )
      or
      (
        not is_free
        and (
          weekday_price is not null
          or weekend_price is not null
          or outdoor_weekday_price is not null
          or outdoor_weekend_price is not null
          or indoor_weekday_price is not null
          or indoor_weekend_price is not null
        )
      )
    );

comment on table public.court_booking_rule_fees is
  '예약 규칙별 무료 여부, 요금 기준 시간, 실내/실외 및 평일/주말 이용요금';
comment on column public.court_booking_rule_fees.is_free is '무료 이용 여부';
comment on column public.court_booking_rule_fees.price_basis_hours is '표시 요금의 이용 기준 시간(1, 2, 3시간)';
comment on column public.court_booking_rule_fees.outdoor_weekday_price is '실외 코트 평일 이용요금(원)';
comment on column public.court_booking_rule_fees.outdoor_weekend_price is '실외 코트 주말 및 공휴일 이용요금(원)';
comment on column public.court_booking_rule_fees.indoor_weekday_price is '실내 코트 평일 이용요금(원)';
comment on column public.court_booking_rule_fees.indoor_weekend_price is '실내 코트 주말 및 공휴일 이용요금(원)';
comment on column public.court_booking_rule_fees.weekday_price is
  '기존 공통 평일 이용요금(원). 실내/실외 구분 전 데이터 호환용';
comment on column public.court_booking_rule_fees.weekend_price is
  '기존 공통 주말 및 공휴일 이용요금(원). 실내/실외 구분 전 데이터 호환용';
