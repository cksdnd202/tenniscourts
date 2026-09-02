begin;

alter table public.court_booking_rule_fees
  add column if not exists lighting_fee_amount integer,
  add column if not exists lighting_fee_basis_hours smallint,
  add column if not exists lighting_start_time time without time zone;

alter table public.court_booking_rule_fees
  drop constraint if exists court_booking_rule_fees_lighting_fee_amount_check,
  drop constraint if exists court_booking_rule_fees_lighting_fee_basis_hours_check,
  drop constraint if exists court_booking_rule_fees_lighting_fee_pair_check,
  drop constraint if exists court_booking_rule_fees_lighting_state_check,
  drop constraint if exists court_booking_rule_fees_free_lighting_check;

alter table public.court_booking_rule_fees
  add constraint court_booking_rule_fees_lighting_fee_amount_check
    check (lighting_fee_amount is null or lighting_fee_amount >= 0),
  add constraint court_booking_rule_fees_lighting_fee_basis_hours_check
    check (lighting_fee_basis_hours is null or lighting_fee_basis_hours in (1, 2, 3)),
  add constraint court_booking_rule_fees_lighting_fee_pair_check
    check (
      (lighting_fee_amount is null and lighting_fee_basis_hours is null)
      or
      (lighting_fee_amount is not null and lighting_fee_basis_hours is not null)
    ),
  add constraint court_booking_rule_fees_lighting_state_check
    check (
      lighting_fee_separate
      or (
        lighting_fee_amount is null
        and lighting_fee_basis_hours is null
        and lighting_start_time is null
      )
    ),
  add constraint court_booking_rule_fees_free_lighting_check
    check (
      not is_free
      or (
        not lighting_fee_separate
        and lighting_fee_amount is null
        and lighting_fee_basis_hours is null
        and lighting_start_time is null
      )
    );

comment on column public.court_booking_rule_fees.lighting_fee_amount is
  '별도 조명 이용요금(원). 금액 미확인 시 null';
comment on column public.court_booking_rule_fees.lighting_fee_basis_hours is
  '별도 조명 이용요금의 기준 시간(1, 2, 3시간)';
comment on column public.court_booking_rule_fees.lighting_start_time is
  '조명비가 적용되기 시작하는 시각. 별도 시작 시각이 없거나 미확인인 경우 null';

-- 미추홀구 두 시설은 하나로 저장되어 있던 예약 규칙을 구민/타지역으로 분리합니다.
update public.court_booking_rules as rule
set
  label = '구민 예약',
  eligibility = 'resident',
  open_time = time '13:00',
  sort_order = 10,
  updated_at = now()
from public.courtinfo as court
where rule.court_id = court.id
  and court.basic_region = '인천'
  and court.basic_court_name in (
    '용현학익1블럭 임시체육시설 테니스장',
    '학익 배수지 테니스장'
  )
  and rule.eligibility = 'normal'
  and rule.is_active = true;

insert into public.court_booking_rules (
  id,
  court_id,
  label,
  eligibility,
  rule_type,
  open_type,
  open_day_of_month,
  open_day_of_week,
  open_ordinal,
  open_time,
  open_offset,
  lottery_desc,
  is_active,
  sort_order,
  created_at,
  updated_at,
  reservation_url,
  booking_round_label,
  usage_period_label,
  interval_weeks,
  anchor_date,
  open_date_adjustment
)
select
  gen_random_uuid(),
  resident_rule.court_id,
  '타지역 예약',
  'non_resident',
  resident_rule.rule_type,
  resident_rule.open_type,
  resident_rule.open_day_of_month,
  resident_rule.open_day_of_week,
  resident_rule.open_ordinal,
  time '15:00',
  resident_rule.open_offset,
  resident_rule.lottery_desc,
  true,
  20,
  now(),
  now(),
  resident_rule.reservation_url,
  resident_rule.booking_round_label,
  resident_rule.usage_period_label,
  resident_rule.interval_weeks,
  resident_rule.anchor_date,
  resident_rule.open_date_adjustment
from public.court_booking_rules as resident_rule
join public.courtinfo as court on court.id = resident_rule.court_id
where court.basic_region = '인천'
  and court.basic_court_name in (
    '용현학익1블럭 임시체육시설 테니스장',
    '학익 배수지 테니스장'
  )
  and resident_rule.eligibility = 'resident'
  and resident_rule.is_active = true
  and not exists (
    select 1
    from public.court_booking_rules as existing_rule
    where existing_rule.court_id = resident_rule.court_id
      and existing_rule.eligibility = 'non_resident'
      and existing_rule.is_active = true
  );

-- 공식 고정 요금을 확인한 인천 공공시설 23곳만 반영합니다.
-- 사설 변동요금, 청소년/어린이 구분, 부가세 안내는 데이터에 넣지 않습니다.
with fee_catalog (
  court_name,
  eligibility,
  is_free,
  price_basis_hours,
  outdoor_weekday_price,
  outdoor_weekend_price,
  indoor_weekday_price,
  indoor_weekend_price,
  lighting_fee_separate,
  lighting_fee_amount,
  lighting_fee_basis_hours,
  lighting_start_time
) as (
  values
    ('계양대교 하부 테니스장', null::text, true, 1, null::integer, null::integer, null::integer, null::integer, false, null::integer, null::smallint, null::time),
    ('3호 테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('남동근린공원 테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('논현포대근린공원테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('늘솔길근린공원 테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('담방 테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('소래샛길 테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('주적체육공원테니스장', null, true, 1, null, null, null, null, false, null, null, null),
    ('청라사업소 테니스장', null, true, 2, null, null, null, null, false, null, null, null),
    ('송도지소 테니스장', null, true, 2, null, null, null, null, false, null, null, null),
    ('인천환경공단 운복사업소 테니스장', null, true, 3, null, null, null, null, false, null, null, null),

    ('용현학익1블럭 임시체육시설 테니스장', 'resident', false, 1, 1500, 1500, null, null, true, 5000, 1::smallint, null),
    ('용현학익1블럭 임시체육시설 테니스장', 'non_resident', false, 1, 3000, 3000, null, null, true, 5000, 1::smallint, null),
    ('학익 배수지 테니스장', 'resident', false, 1, 2500, 2500, null, null, true, 5000, 1::smallint, null),
    ('학익 배수지 테니스장', 'non_resident', false, 1, 5000, 5000, null, null, true, 5000, 1::smallint, null),
    ('건강공원 테니스장', null, false, 2, 5000, 5000, null, null, true, 2500, 2::smallint, null),
    ('신트리 테니스장', null, false, 2, 5000, 5000, null, null, true, 2500, 2::smallint, null),
    ('열우물경기장', null, false, 1, 10000, 10000, 24000, 24000, false, null, null, null),
    ('원적산 테니스장', null, false, 1, 2000, 2000, null, null, true, 12000, 1::smallint, null),
    ('공촌유수지 테니스장', null, false, 2, 20000, 20000, null, null, true, 2500, 1::smallint, null),
    ('인천 인재개발원 테니스장', null, false, 1, 5000, 5000, null, null, false, null, null, null),
    ('인천시립가좌테니스장', null, false, 1, 10000, 10000, 20000, 20000, false, null, null, null),
    ('새아침공원 테니스장', null, false, 2, 5000, 5000, null, null, true, 2500, 2::smallint, time '18:00'),
    ('송도달빛축제공원보조경기장', null, false, 2, null, null, 40000, 50000, true, 5000, 1::smallint, time '18:00'),
    ('하늘문화센터테니스장', null, false, 2, 8000, 10000, null, null, true, 2000, 2::smallint, null)
), matched_fees as (
  select
    rule.id as booking_rule_id,
    catalog.is_free,
    catalog.price_basis_hours,
    catalog.outdoor_weekday_price,
    catalog.outdoor_weekend_price,
    catalog.indoor_weekday_price,
    catalog.indoor_weekend_price,
    catalog.lighting_fee_separate,
    catalog.lighting_fee_amount,
    catalog.lighting_fee_basis_hours,
    catalog.lighting_start_time
  from fee_catalog as catalog
  join public.courtinfo as court
    on court.basic_region = '인천'
   and court.basic_court_name = catalog.court_name
  join public.court_booking_rules as rule
    on rule.court_id = court.id
   and rule.is_active = true
   and (catalog.eligibility is null or rule.eligibility = catalog.eligibility)
)
insert into public.court_booking_rule_fees (
  booking_rule_id,
  is_free,
  price_basis_hours,
  outdoor_weekday_price,
  outdoor_weekend_price,
  indoor_weekday_price,
  indoor_weekend_price,
  lighting_fee_separate,
  lighting_fee_amount,
  lighting_fee_basis_hours,
  lighting_start_time,
  updated_at
)
select
  booking_rule_id,
  is_free,
  price_basis_hours,
  outdoor_weekday_price,
  outdoor_weekend_price,
  indoor_weekday_price,
  indoor_weekend_price,
  lighting_fee_separate,
  lighting_fee_amount,
  lighting_fee_basis_hours,
  lighting_start_time,
  now()
from matched_fees
on conflict (booking_rule_id) do update set
  is_free = excluded.is_free,
  price_basis_hours = excluded.price_basis_hours,
  outdoor_weekday_price = excluded.outdoor_weekday_price,
  outdoor_weekend_price = excluded.outdoor_weekend_price,
  indoor_weekday_price = excluded.indoor_weekday_price,
  indoor_weekend_price = excluded.indoor_weekend_price,
  lighting_fee_separate = excluded.lighting_fee_separate,
  lighting_fee_amount = excluded.lighting_fee_amount,
  lighting_fee_basis_hours = excluded.lighting_fee_basis_hours,
  lighting_start_time = excluded.lighting_start_time,
  updated_at = excluded.updated_at;

update public.courtinfo
set updated_at = now()
where basic_region = '인천'
  and basic_court_name in (
    '계양대교 하부 테니스장',
    '3호 테니스장',
    '남동근린공원 테니스장',
    '논현포대근린공원테니스장',
    '늘솔길근린공원 테니스장',
    '담방 테니스장',
    '소래샛길 테니스장',
    '주적체육공원테니스장',
    '청라사업소 테니스장',
    '송도지소 테니스장',
    '인천환경공단 운복사업소 테니스장',
    '용현학익1블럭 임시체육시설 테니스장',
    '학익 배수지 테니스장',
    '건강공원 테니스장',
    '신트리 테니스장',
    '열우물경기장',
    '원적산 테니스장',
    '공촌유수지 테니스장',
    '인천 인재개발원 테니스장',
    '인천시립가좌테니스장',
    '새아침공원 테니스장',
    '송도달빛축제공원보조경기장',
    '하늘문화센터테니스장'
  );

commit;
