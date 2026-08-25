alter table public.court_booking_rules
add column if not exists open_date_adjustment text not null default 'none';

alter table public.court_booking_rules
drop constraint if exists court_booking_rules_open_date_adjustment_check;

alter table public.court_booking_rules
add constraint court_booking_rules_open_date_adjustment_check
check (open_date_adjustment in ('none', 'next_weekday'));
