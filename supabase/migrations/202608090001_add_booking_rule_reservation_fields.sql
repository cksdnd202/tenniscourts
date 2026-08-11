alter table public.court_booking_rules
add column if not exists reservation_url text,
add column if not exists booking_round_label text,
add column if not exists usage_period_label text;
