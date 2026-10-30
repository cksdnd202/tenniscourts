alter table public.court_surface_counts
  drop constraint if exists court_surface_counts_surface_type_check;

alter table public.court_surface_counts
  add constraint court_surface_counts_surface_type_check
  check (
    surface_type in (
      'hard',
      'grass',
      'clay',
      'wood',
      'synthetic',
      'urethane',
      'artificial_grass',
      'clay_soil',
      'modular',
      'concrete',
      'other',
      'pending'
    )
  );

comment on column public.court_surface_counts.surface_type is
  'Court surface code. Badminton supports wood, synthetic, urethane, artificial_grass, clay_soil, modular, concrete, other, and pending.';
