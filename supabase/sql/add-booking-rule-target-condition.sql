-- Run in the Courts Korea project's SQL Editor (not the MOVO project).
-- Nullable for backwards compatibility; empty text explicitly means no condition.
begin;
set local lock_timeout = '5s';

alter table public.court_booking_rules
  add column if not exists target_condition text;

comment on column public.court_booking_rules.target_condition is
  'Optional booking target condition displayed alongside eligibility; not a booking phase or usage-period label.';

-- Only copy conditions explicitly present in the existing labels. Do not infer team sizes.
with mappings(court_name, rule_label, condition) as (values
  ('면목구립테니스장', '구민, 3인 이상 팀', '3인 이상 팀'),
  ('면목구립테니스장', '구민, 2인 이상 팀', '2인 이상 팀'),
  ('대림운동장 테니스장', '구민 팀', '팀'),
  ('양평누리체육공원 테니스장', '구민 팀 우선', '팀'),
  ('다락원체육공원 테니스장', '도봉구 테니스연합 소속 클럽 우선', '도봉구 테니스연합회 소속 클럽'),
  ('광주시 양벌테니스돔', '관내 팀 정규대관', '팀')
), changed as (
  update public.court_booking_rules r
  set target_condition = m.condition,
      eligibility = case
        when m.court_name = '면목구립테니스장' then 'resident'
        -- Club membership does not imply residency. With none, display the condition alone.
        when m.court_name = '다락원체육공원 테니스장' then 'none'
        else r.eligibility end,
      updated_at = now()
  from public.courtinfo c, mappings m
  where r.court_id = c.id and c.basic_court_name = m.court_name
    and r.label = m.rule_label and r.target_condition is null
  returning r.court_id
)
update public.courtinfo c set updated_at = now()
where c.id in (select court_id from changed);

notify pgrst, 'reload schema';
commit;

-- Verification: expect six seeded rules across five facilities (unless already customized).
select c.basic_court_name, r.label, r.eligibility, r.target_condition
from public.court_booking_rules r
join public.courtinfo c on c.id = r.court_id
where c.basic_court_name in ('면목구립테니스장', '대림운동장 테니스장',
  '양평누리체육공원 테니스장', '다락원체육공원 테니스장', '광주시 양벌테니스돔')
order by c.basic_court_name, r.sort_order;
