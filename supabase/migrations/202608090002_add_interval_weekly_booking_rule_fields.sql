alter table public.court_booking_rules
  add column if not exists interval_weeks integer,
  add column if not exists anchor_date date;

comment on column public.court_booking_rules.interval_weeks is
  'Weekly interval for interval_weekly booking rules. Example: 2 means every two weeks.';

comment on column public.court_booking_rules.anchor_date is
  'Reference open date for interval_weekly booking rules.';
