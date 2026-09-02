alter table public.court_booking_rule_fees
  drop constraint if exists court_booking_rule_fees_free_price_check,
  drop constraint if exists court_booking_rule_fees_weekday_price_check,
  drop constraint if exists court_booking_rule_fees_weekend_price_check,
  drop constraint if exists court_booking_rule_fees_has_price_check;

-- 구분 요금이 없는 기존 유료 행은 공통 요금 컬럼 제거 후 의미가 없어지므로 삭제합니다.
delete from public.court_booking_rule_fees
where not is_free
  and outdoor_weekday_price is null
  and outdoor_weekend_price is null
  and indoor_weekday_price is null
  and indoor_weekend_price is null;

alter table public.court_booking_rule_fees
  drop column if exists weekday_price,
  drop column if exists weekend_price;

alter table public.court_booking_rule_fees
  add constraint court_booking_rule_fees_free_price_check
    check (
      (
        is_free
        and outdoor_weekday_price is null
        and outdoor_weekend_price is null
        and indoor_weekday_price is null
        and indoor_weekend_price is null
      )
      or
      (
        not is_free
        and (
          outdoor_weekday_price is not null
          or outdoor_weekend_price is not null
          or indoor_weekday_price is not null
          or indoor_weekend_price is not null
        )
      )
    );

comment on table public.court_booking_rule_fees is
  '예약 규칙별 무료 여부, 요금 기준 시간, 실내/실외 및 평일/주말 이용요금';
